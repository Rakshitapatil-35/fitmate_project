"""
ML client service that orchestrates ML prediction across the 3-tier hierarchy:
  (a) Tier 1 ('ml_3model'): 3-model ML engine (direct import of src.predict or HTTP to ML_SERVICE_URL)
  (b) Tier 2 ('ml_stub'):   app/ml/artifacts/size_model.joblib scikit-learn classifier
  (c) Tier 3 ('rule_engine'): rule-based RecommendationEngine fallback
Logs every prediction and which tier answered in `prediction_logs`.
"""

import json
import time
from typing import Any, Dict, List, Optional, Tuple

from sqlalchemy.orm import Session

from app.config import settings
from app.core.logging import logger
from app.ml.predictor import MLPredictor
from app.ml.version import MODEL_VERSION
from app.models.recommendation import PredictionLog
from app.schemas.recommendation import RankedSizeOption, RecommendationExplanation
from app.services.recommendation_engine import RecommendationEngine


class MLRecommendationClient:
    """Service coordinating ML model inference, rule-based fallback, and audit logging."""

    def __init__(
        self,
        predictor: Optional[MLPredictor] = None,
        rule_engine: Optional[RecommendationEngine] = None,
    ) -> None:
        self.predictor = predictor or MLPredictor()
        self.rule_engine = rule_engine or RecommendationEngine()

    def recommend_with_fallback(
        self,
        db: Session,
        category_code: str,
        body_measurements: Dict[str, Optional[float]],
        garment_rows: List[Dict[str, Any]],
        allowed_sizes: List[str],
        fit_preference: str = "regular",
        product_stretch_pct: float = 0.0,
        verification_status: str = "verified",
        top_n: int = 3,
        use_ml: bool = True,
        user_id: Optional[int] = None,
        product_id: Optional[int] = None,
        brand_name: str = "FITMATE",
    ) -> Tuple[List[RankedSizeOption], RecommendationExplanation, Dict[str, Any], PredictionLog]:
        """
        Execute size recommendation using the 3-tier ML/rule hierarchy:
          1. 'ml_3model' (3-model engine via src.predict or HTTP ML service)
          2. 'ml_stub'   (app/ml/artifacts/size_model.joblib)
          3. 'rule_engine' (category-specific physical ease strategy engine)
        Records `source` ("ml_3model" | "ml_stub" | "rule_engine") in explanation and prediction_logs.
        """
        start_time = time.perf_counter()

        # Always compute rule-based rankings and rich per-measurement explanations
        ranked_sizes, explanation = self.rule_engine.recommend(
            category_code=category_code,
            body_measurements=body_measurements,
            garment_rows=garment_rows,
            fit_preference=fit_preference,
            product_stretch_pct=product_stretch_pct,
            verification_status=verification_status,
            top_n=max(top_n, len(garment_rows)),
        )

        fallback_used = False
        fallback_reason: Optional[str] = None
        method_used = "rule_based"
        source_tier = "rule_engine"
        model_version = MODEL_VERSION

        ml_summary: Dict[str, Any] = {"source": "rule_engine"}

        if not use_ml or not settings.ML_ENABLED:
            fallback_used = True
            fallback_reason = "ML disabled by request or configuration"
            chosen_option = ranked_sizes[0]
            ml_summary = {
                "status": "disabled",
                "source": "rule_engine",
                "reason": fallback_reason,
            }
        else:
            try:
                ml_output = self.predictor.predict(
                    category_code=category_code,
                    body_measurements=body_measurements,
                    garment_rows=garment_rows,
                    fit_preference=fit_preference,
                    stretch_pct=product_stretch_pct,
                    allowed_sizes=allowed_sizes,
                )
                model_version = ml_output.model_version
                source_tier = getattr(ml_output, "source", "ml_stub") or "ml_stub"

                # Verify that the ML predicted size isn't severely constrictive according to rules
                matched_rule_opt = next(
                    (opt for opt in ranked_sizes if opt.size_label == ml_output.predicted_size),
                    None,
                )
                if matched_rule_opt is None:
                    raise ValueError(f"Predicted size '{ml_output.predicted_size}' not found in rule rankings.")

                if matched_rule_opt.score < 45.0:
                    raise ValueError(
                        f"ML predicted size '{ml_output.predicted_size}' scored too low ({matched_rule_opt.score}) "
                        "on physical ease checks; triggering rule-based safety fallback."
                    )

                # Promote the validated ML size or blend confidence with the top rule size
                method_used = "ml_hybrid"
                fallback_used = source_tier != "ml_3model" and self.predictor.enable_3model
                if fallback_used:
                    fallback_reason = "Primary 3-model ML unavailable; answered by Tier-2 ml_stub"
                chosen_option = matched_rule_opt
                ranked_sizes = [chosen_option] + [
                    opt for opt in ranked_sizes if opt.size_label != chosen_option.size_label
                ]
                explanation.per_measurement_notes = chosen_option.measurement_notes
                ml_summary = {
                    "predicted_size": ml_output.predicted_size,
                    "fit_category": ml_output.fit_category,
                    "confidence": ml_output.confidence,
                    "model_version": ml_output.model_version,
                    "source": source_tier,
                    "status": "validated",
                }
            except Exception as exc:
                fallback_used = True
                fallback_reason = str(exc)
                method_used = "rule_based_fallback"
                source_tier = "rule_engine"
                chosen_option = ranked_sizes[0]
                ml_summary = {
                    "status": "fallback_to_rules",
                    "source": "rule_engine",
                    "reason": fallback_reason,
                }
                logger.info(
                    f"ML fallback triggered for product_id={product_id}: {fallback_reason}",
                    extra={"extra_data": {"fallback_reason": fallback_reason}},
                )

        latency_ms = round((time.perf_counter() - start_time) * 1000.0, 3)

        # Enrich with Model 3, Model 4, and Model 5 outputs if available
        try:
            from app.services.model_service import default_model_service

            # Model 4: Body shape archetype
            h = body_measurements.get("height") or 168.0
            w = body_measurements.get("weight") or 62.0
            waist = body_measurements.get("waist") or 72.0
            gender = "male" if "men" in category_code.lower() else "female"
            try:
                body_shape_res = default_model_service.predict_body_shape(
                    gender=gender,
                    height_cm=float(h),
                    weight_kg=float(w),
                    waist_cm=float(waist),
                )
                ml_summary["body_shape"] = body_shape_res
            except Exception as e:
                logger.debug(f"Model 4 body shape prediction skipped: {e}")

            # Model 5: Fit satisfaction & return risk
            hips = body_measurements.get("hips") or 96.0
            size_to_num = {"XXS": 0.0, "XS": 2.0, "S": 4.0, "M": 8.0, "L": 12.0, "XL": 16.0, "XXL": 20.0, "XXXL": 24.0}
            num_size = size_to_num.get(str(chosen_option.size_label).upper(), 8.0)
            try:
                fit_risk_res = default_model_service.predict_fit_risk(
                    size=num_size,
                    height_cm=float(h),
                    weight_kg=float(w),
                    waist_cm=float(waist),
                    hips_cm=float(hips),
                    category=category_code,
                )
                ml_summary["fit_risk"] = fit_risk_res
            except Exception as e:
                logger.debug(f"Model 5 fit risk prediction skipped: {e}")

            # Model 3: Estimated Garment Dimensions
            try:
                g_dims = default_model_service.predict_garment_dims(
                    brand=brand_name or "FITMATE",
                    category=category_code,
                    size=chosen_option.size_label,
                )
                ml_summary["estimated_garment_dims"] = g_dims
            except Exception as e:
                logger.debug(f"Model 3 dims prediction skipped: {e}")
        except Exception as exc:
            logger.debug(f"Auxiliary model enrichment skipped: {exc}")

        explanation.ml_prediction = ml_summary
        top_ranked_sliced = ranked_sizes[:top_n]

        input_payload = {
            "category_code": category_code,
            "body_measurements": body_measurements,
            "fit_preference": fit_preference,
            "product_stretch_pct": product_stretch_pct,
            "allowed_sizes": allowed_sizes,
        }
        output_payload = {
            "recommended_size": chosen_option.size_label,
            "fit_category": chosen_option.fit_category,
            "score": chosen_option.score,
            "confidence": chosen_option.confidence,
            "method_used": method_used,
            "source": source_tier,
            "ml_summary": ml_summary,
        }

        prediction_log = PredictionLog(
            user_id=user_id,
            product_id=product_id,
            model_version=model_version,
            input_payload_json=json.dumps(input_payload, default=str),
            output_payload_json=json.dumps(output_payload, default=str),
            predicted_size=chosen_option.size_label,
            fit_category=chosen_option.fit_category,
            confidence=chosen_option.confidence,
            latency_ms=latency_ms,
            fallback_used=fallback_used,
            fallback_reason=fallback_reason,
        )
        db.add(prediction_log)
        db.flush()

        metadata = {
            "recommended_size": chosen_option.size_label,
            "fit_category": chosen_option.fit_category,
            "score": chosen_option.score,
            "confidence": chosen_option.confidence,
            "method_used": method_used,
            "source": source_tier,
            "fallback_used": fallback_used,
            "model_version": model_version,
            "latency_ms": latency_ms,
        }

        return top_ranked_sliced, explanation, metadata, prediction_log
