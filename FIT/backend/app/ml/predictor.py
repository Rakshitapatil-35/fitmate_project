"""ML predictor supporting the 3-Model ML Engine (direct import or HTTP) with stub & rule fallback."""

from typing import Any, Callable, Dict, List, Optional
import httpx
import numpy as np
from pydantic import BaseModel, Field, field_validator

from app.config import settings
from app.core.logging import logger
from app.ml.model_loader import ModelLoader, default_model_loader
from app.ml.version import ALLOWED_FIT_CATEGORIES

FIT_PREF_MAP = {"slim": 0, "regular": 1, "relaxed": 2}
FIT_PREF_TO_3MODEL = {"slim": "tight", "regular": "fit", "relaxed": "loose"}
FIT_CLASS_TO_BACKEND = {"tight": "too_tight", "fit": "good_fit", "loose": "loose"}


class ValidatedMLOutput(BaseModel):
    """Pydantic v2 schema enforcing strict validation on ML model predictions."""

    predicted_size: str = Field(..., min_length=1, max_length=32)
    fit_category: str
    confidence: float = Field(..., ge=0.0, le=1.0)
    model_version: str
    source: str = Field(default="ml_stub")

    @field_validator("fit_category")
    @classmethod
    def check_fit_category(cls, value: str) -> str:
        if value not in ALLOWED_FIT_CATEGORIES:
            raise ValueError(f"Invalid fit_category '{value}'. Must be one of {ALLOWED_FIT_CATEGORIES}")
        return value


def _build_3model_payload(
    category_code: str,
    body_measurements: Dict[str, Optional[float]],
    fit_preference: str,
) -> Dict[str, Any]:
    """Convert backend cm/kg body measurements into the 3-model engine profile & product schema."""
    chest_bust = body_measurements.get("chest_bust")
    waist = body_measurements.get("waist")
    hips = body_measurements.get("hips")
    height = body_measurements.get("height")
    weight = body_measurements.get("weight")

    if chest_bust is None and waist is None and hips is None:
        raise ValueError("Primary body measurement missing for 3-model ML prediction.")

    profile: Dict[str, Any] = {
        "height": float(height) if height is not None else 172.0,
        "weight": f"{float(weight):.1f} kg" if weight is not None else "65.0 kg",
        "age": 28,
        "fit_preference": FIT_PREF_TO_3MODEL.get(fit_preference, "fit"),
    }
    if chest_bust is not None:
        profile["bust"] = float(chest_bust)
    if waist is not None:
        profile["waist"] = float(waist)
    if hips is not None:
        profile["hip"] = float(hips)

    cat_name = "top" if "tops" in category_code else "bottoms"
    return {
        "profile": profile,
        "product": {"category": cat_name, "brand": "FITMATE"},
    }


def invoke_3model_engine(
    category_code: str,
    body_measurements: Dict[str, Optional[float]],
    fit_preference: str,
    prefer_http: bool = False,
    service_url: Optional[str] = None,
    timeout_seconds: Optional[float] = None,
    direct_predict_size_fn: Optional[Callable[..., Dict[str, Any]]] = None,
    direct_predict_fit_fn: Optional[Callable[..., Dict[str, Any]]] = None,
) -> Dict[str, Any]:
    """
    Call the 3-model ML engine:
      1. Direct Python import of `src.predict.predict_size` / `predict_fit` (unless `prefer_http=True`).
      2. HTTP fallback to `{ML_SERVICE_URL}/predict/size` and `/predict/fit` with a short timeout.
    """
    payload = _build_3model_payload(category_code, body_measurements, fit_preference)
    profile_payload = payload["profile"]
    product_payload = payload["product"]

    if not prefer_http:
        try:
            if direct_predict_size_fn is None or direct_predict_fit_fn is None:
                from src.predict import predict_fit as _pf, predict_size as _ps

                size_fn = direct_predict_size_fn or _ps
                fit_fn = direct_predict_fit_fn or _pf
            else:
                size_fn = direct_predict_size_fn
                fit_fn = direct_predict_fit_fn

            size_res = size_fn(profile_payload, product_payload)
            pred_size = size_res["size"]
            try:
                fit_res = fit_fn(
                    profile_payload,
                    {"category": product_payload["category"], "size": pred_size},
                )
                fit_class = fit_res.get("fit_class", "fit")
            except Exception:
                fit_class = "fit"

            return {
                "size": pred_size,
                "probabilities": size_res.get("probabilities", {}),
                "confidence": float(size_res.get("confidence", 0.75)),
                "fit_class": fit_class,
                "transport": "direct",
            }
        except Exception as direct_exc:
            logger.info(f"Direct 3-model import inference failed ({direct_exc}); trying HTTP ML service.")

    base_url = (service_url or settings.ML_SERVICE_URL or "http://localhost:8000").rstrip("/")
    timeout = timeout_seconds if timeout_seconds is not None else settings.ML_TIMEOUT_SECONDS

    with httpx.Client(timeout=timeout) as http_client:
        resp_size = http_client.post(f"{base_url}/predict/size", json=payload)
        resp_size.raise_for_status()
        size_data = resp_size.json()
        pred_size = size_data["size"]

        fit_class = "fit"
        try:
            resp_fit = http_client.post(
                f"{base_url}/predict/fit",
                json={
                    "profile": profile_payload,
                    "garment": {"category": product_payload["category"], "size": pred_size},
                },
            )
            if resp_fit.status_code == 200:
                fit_class = resp_fit.json().get("fit_class", "fit")
        except Exception:
            pass

        return {
            "size": pred_size,
            "probabilities": size_data.get("probabilities", {}),
            "confidence": float(size_data.get("confidence", 0.75)),
            "fit_class": fit_class,
            "transport": "http",
        }


class MLPredictor:
    """
    Runs inference with a 2-stage ML hierarchy before rule fallback:
      Tier 1 ('ml_3model'): 3-model XGBoost/RandomForest engine (src.predict or HTTP ML service)
      Tier 2 ('ml_stub'):   app/ml/artifacts/size_model.joblib scikit-learn classifier
    """

    def __init__(
        self,
        loader: Optional[ModelLoader] = None,
        auto_create_if_missing: bool = True,
        enable_3model: Optional[bool] = None,
        prefer_http_3model: bool = False,
        three_model_runner: Optional[Callable[..., Dict[str, Any]]] = None,
    ) -> None:
        self.loader = loader or default_model_loader
        self.auto_create_if_missing = auto_create_if_missing
        # If a custom broken loader is injected with auto_create_if_missing=False in unit tests,
        # default enable_3model to False unless explicitly set to True.
        if enable_3model is None:
            self.enable_3model = not (loader is not None and not auto_create_if_missing)
        else:
            self.enable_3model = enable_3model
        self.prefer_http_3model = prefer_http_3model
        self.three_model_runner = three_model_runner

    def _infer_ease_fit_category(
        self,
        category_code: str,
        body_measurements: Dict[str, Optional[float]],
        garment_rows: List[Dict[str, Any]],
        best_size: str,
        default_fit_category: str = "good_fit",
    ) -> str:
        primary = (
            body_measurements.get("chest_bust")
            if "tops" in category_code
            else (body_measurements.get("waist") or body_measurements.get("hips"))
        )
        matched_row = next((r for r in garment_rows if str(r["size_label"]) == best_size), None)
        if matched_row and primary is not None:
            garment_primary = (
                matched_row.get("chest_bust_cm")
                if "tops" in category_code
                else matched_row.get("waist_cm") or matched_row.get("hips_cm")
            )
            if garment_primary is not None:
                ease = float(garment_primary) - float(primary)
                if ease < 1.0:
                    return "too_tight"
                if ease > 16.0:
                    return "loose"
                return "good_fit"
        return default_fit_category

    def _predict_tier1_3model(
        self,
        category_code: str,
        body_measurements: Dict[str, Optional[float]],
        garment_rows: List[Dict[str, Any]],
        fit_preference: str,
        allowed_sizes: List[str],
        min_confidence: Optional[float] = None,
    ) -> ValidatedMLOutput:
        runner = self.three_model_runner or invoke_3model_engine
        raw = runner(
            category_code=category_code,
            body_measurements=body_measurements,
            fit_preference=fit_preference,
            prefer_http=self.prefer_http_3model,
        )

        probs: Dict[str, float] = raw.get("probabilities") or {}
        chart_sizes = [str(r["size_label"]) for r in garment_rows]
        valid_allowed = set(allowed_sizes) & set(chart_sizes) if allowed_sizes else set(chart_sizes)

        best_size: Optional[str] = None
        best_conf: float = float(raw.get("confidence", 0.0))

        if probs:
            sorted_candidates = sorted(probs.items(), key=lambda kv: float(kv[1]), reverse=True)
            for cand_size, cand_prob in sorted_candidates:
                if str(cand_size) in valid_allowed:
                    best_size = str(cand_size)
                    compatible_sum = sum(float(v) for k, v in probs.items() if str(k) in valid_allowed)
                    raw_p = float(cand_prob)
                    best_conf = round(
                        min(0.96, max(raw_p, raw_p / max(compatible_sum, 0.01) * 0.85)),
                        2,
                    )
                    break
        elif str(raw.get("size")) in valid_allowed:
            best_size = str(raw["size"])
            best_conf = round(min(0.96, max(0.6, best_conf)), 2)

        if best_size is None:
            raise ValueError(
                f"3-model ML classes {list(probs.keys())} do not match product's allowed size chart {sorted(valid_allowed)}."
            )

        threshold = min_confidence if min_confidence is not None else settings.ML_MIN_CONFIDENCE
        if best_conf < threshold:
            raise ValueError(
                f"3-model ML confidence ({best_conf:.2f}) is below minimum threshold ({threshold:.2f})."
            )

        mapped_fit = FIT_CLASS_TO_BACKEND.get(str(raw.get("fit_class", "fit")), "good_fit")
        fit_category = self._infer_ease_fit_category(
            category_code=category_code,
            body_measurements=body_measurements,
            garment_rows=garment_rows,
            best_size=best_size,
            default_fit_category=mapped_fit,
        )

        return ValidatedMLOutput(
            predicted_size=best_size,
            fit_category=fit_category,
            confidence=best_conf,
            model_version="2.0.0-3model-xgboost",
            source="ml_3model",
        )

    def _predict_tier2_stub(
        self,
        category_code: str,
        body_measurements: Dict[str, Optional[float]],
        garment_rows: List[Dict[str, Any]],
        fit_preference: str,
        stretch_pct: float,
        allowed_sizes: List[str],
        min_confidence: Optional[float] = None,
    ) -> ValidatedMLOutput:
        bundle = self.loader.load(auto_create_if_missing=self.auto_create_if_missing)
        if bundle is None:
            raise RuntimeError("ML model artifact is unavailable or disabled.")

        clf = bundle["classifier"]
        model_version = str(bundle.get("model_version", "1.0.0-sklearn"))

        if "tops" in category_code:
            primary = body_measurements.get("chest_bust")
            secondary = body_measurements.get("waist") or (primary * 0.85 if primary else None)
        else:
            primary = body_measurements.get("waist") or body_measurements.get("hips")
            secondary = body_measurements.get("hips") or primary

        if primary is None or secondary is None:
            raise ValueError("Primary body measurement missing for ML feature vector.")

        fit_code = FIT_PREF_MAP.get(fit_preference, 1)
        features = np.array([[float(primary), float(secondary), float(stretch_pct), float(fit_code)]])

        proba = clf.predict_proba(features)[0]
        classes = list(clf.classes_)

        chart_sizes = [str(r["size_label"]) for r in garment_rows]
        valid_allowed = set(allowed_sizes) & set(chart_sizes) if allowed_sizes else set(chart_sizes)

        best_size: Optional[str] = None
        best_conf: float = 0.0

        ranked_indices = np.argsort(proba)[::-1]
        for idx in ranked_indices:
            candidate_size = str(classes[idx])
            if candidate_size in valid_allowed:
                best_size = candidate_size
                compatible_prob_sum = sum(
                    float(proba[i]) for i, c in enumerate(classes) if str(c) in valid_allowed
                )
                raw_p = float(proba[idx])
                best_conf = round(
                    min(0.96, max(raw_p, raw_p / max(compatible_prob_sum, 0.01) * 0.85)),
                    2,
                )
                break

        if best_size is None:
            raise ValueError(
                f"ML model classes {classes} do not match product's allowed size chart {sorted(valid_allowed)}."
            )

        fit_category = self._infer_ease_fit_category(
            category_code=category_code,
            body_measurements=body_measurements,
            garment_rows=garment_rows,
            best_size=best_size,
            default_fit_category="good_fit",
        )

        threshold = min_confidence if min_confidence is not None else settings.ML_MIN_CONFIDENCE
        if best_conf < threshold:
            raise ValueError(
                f"ML prediction confidence ({best_conf:.2f}) is below minimum threshold ({threshold:.2f})."
            )

        return ValidatedMLOutput(
            predicted_size=best_size,
            fit_category=fit_category,
            confidence=best_conf,
            model_version=model_version,
            source="ml_stub",
        )

    def predict(
        self,
        category_code: str,
        body_measurements: Dict[str, Optional[float]],
        garment_rows: List[Dict[str, Any]],
        fit_preference: str,
        stretch_pct: float,
        allowed_sizes: List[str],
        min_confidence: Optional[float] = None,
    ) -> ValidatedMLOutput:
        """
        Predict the best size and fit category using Tier 1 (3-model engine) first,
        then falling back to Tier 2 (stub joblib model).
        Raises ValueError or RuntimeError if both ML tiers fail so Tier 3 (rule engine) can take over.
        """
        tier1_error: Optional[Exception] = None
        if self.enable_3model:
            try:
                return self._predict_tier1_3model(
                    category_code=category_code,
                    body_measurements=body_measurements,
                    garment_rows=garment_rows,
                    fit_preference=fit_preference,
                    allowed_sizes=allowed_sizes,
                    min_confidence=min_confidence,
                )
            except Exception as exc:
                tier1_error = exc
                logger.info(f"Tier-1 3-model ML failed ({exc}); falling back to Tier-2 stub model.")

        try:
            return self._predict_tier2_stub(
                category_code=category_code,
                body_measurements=body_measurements,
                garment_rows=garment_rows,
                fit_preference=fit_preference,
                stretch_pct=stretch_pct,
                allowed_sizes=allowed_sizes,
                min_confidence=min_confidence,
            )
        except Exception as tier2_exc:
            if tier1_error is not None:
                raise RuntimeError(f"Tier1 ({tier1_error}) and Tier2 ({tier2_exc}) unavailable.") from tier2_exc
            raise
