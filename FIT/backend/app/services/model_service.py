"""
FITMATE Unified ML Model Service
Loads all trained models once at startup using exact training preprocessing.
Exposes clean validated prediction functions and service health/status check.
Models:
  - Model 1: XGBoost Size Classifier (XXS..XXXL)
  - Model 2: Calibrated RandomForest Fit Classifier (tight / fit / loose)
  - Model 3: Garment Dimensions Multi-Regressor (bust, waist, length, inseam)
  - Model 4: Body Archetype KMeans Clustering (Female & Male NHANES models)
  - Model 5: Fit Feedback / Return Risk Classifier (good_fit / too_tight / too_loose)
"""

import json
import os
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple, Union

import joblib
import numpy as np
import pandas as pd

from app.core.logging import logger
from src.utils import (
    FIT_CLASSES,
    SIZE_ORDER,
    map_fit_label,
    normalise_size_label,
    parse_bust_size,
    parse_circumference_to_cm,
    parse_height_to_cm,
    parse_inches_to_cm,
    parse_weight_to_kg,
    standardise_category,
)


def _find_model_directory() -> Path:
    """Dynamically locate the directory containing trained models."""
    base_candidates = [
        Path(__file__).resolve().parent.parent.parent / "models",
        Path.cwd() / "models",
        Path.cwd() / "stitch_fitmate_clothing_size_advisor" / "fitmate" / "models",
        Path.cwd() / "stitch_fitmate_clothing_size_advisor" / "__MACOSX" / "models",
        Path(__file__).resolve().parent.parent.parent.parent / "__MACOSX" / "models",
    ]
    for candidate in base_candidates:
        if candidate.exists() and (candidate / "model_1_size.joblib").exists():
            return candidate.resolve()
    for candidate in base_candidates:
        if candidate.exists():
            return candidate.resolve()
    # Default fallback
    return (Path(__file__).resolve().parent.parent.parent / "models").resolve()


MODEL_DIR = _find_model_directory()


class ModelService:
    """Singleton service holding preloaded ML model artifacts and metadata."""

    _instance: Optional["ModelService"] = None

    def __init__(self) -> None:
        self.model_dir = MODEL_DIR
        self.model_1 = None
        self.model_1_meta: Dict[str, Any] = {}
        self.model_2 = None
        self.model_2_meta: Dict[str, Any] = {}
        self.model_3 = None
        self.model_3_meta: Dict[str, Any] = {}
        self.model_4_female = None
        self.model_4_female_meta: Dict[str, Any] = {}
        self.model_4_male = None
        self.model_4_male_meta: Dict[str, Any] = {}
        self.model_5 = None
        self.model_5_meta: Dict[str, Any] = {}
        self._is_loaded = False
        self._load_errors: Dict[str, str] = {}

    @classmethod
    def get_instance(cls) -> "ModelService":
        if cls._instance is None:
            cls._instance = ModelService()
        return cls._instance

    def _load_json_metadata(self, filename: str) -> Dict[str, Any]:
        path = self.model_dir / filename
        if not path.exists():
            alt = self.model_dir.parent.parent / "__MACOSX" / "models" / filename
            if alt.exists():
                path = alt
        if path.exists():
            try:
                with open(path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.warning(f"Could not load metadata {filename}: {e}")
        return {}

    def _resolve_model_file(self, filename: str) -> Path:
        primary = self.model_dir / filename
        if primary.exists():
            return primary
        alt = self.model_dir.parent.parent / "__MACOSX" / "models" / filename
        if alt.exists():
            return alt
        alt2 = Path.cwd() / "stitch_fitmate_clothing_size_advisor" / "__MACOSX" / "models" / filename
        if alt2.exists():
            return alt2
        raise FileNotFoundError(f"Model artifact '{filename}' not found in {self.model_dir} or fallbacks.")

    def load_all(self, fail_loudly: bool = False) -> None:
        """Load all 5 models and their metadata once into memory."""
        logger.info(f"Loading FITMATE ML Models from {self.model_dir}...")
        self._load_errors.clear()

        # Model 1: Size Classifier
        try:
            p1 = self._resolve_model_file("model_1_size.joblib")
            self.model_1 = joblib.load(p1)
            self.model_1_meta = self._load_json_metadata("model_1_metadata.json")
            logger.info("✓ Model 1 (Size Classifier) loaded successfully.")
        except Exception as exc:
            err = f"Failed to load Model 1: {exc}"
            self._load_errors["model_1"] = err
            logger.error(err)
            if fail_loudly:
                raise

        # Model 2: Fit Recommendation
        try:
            p2 = self._resolve_model_file("model_2_fit.joblib")
            self.model_2 = joblib.load(p2)
            self.model_2_meta = self._load_json_metadata("model_2_metadata.json")
            logger.info("✓ Model 2 (Fit Recommendation) loaded successfully.")
        except Exception as exc:
            err = f"Failed to load Model 2: {exc}"
            self._load_errors["model_2"] = err
            logger.error(err)
            if fail_loudly:
                raise

        # Model 3: Garment Dimensions Regressor
        try:
            p3 = self._resolve_model_file("model_3_garment.joblib")
            self.model_3 = joblib.load(p3)
            self.model_3_meta = self._load_json_metadata("model_3_metadata.json")
            logger.info("✓ Model 3 (Garment Regressor) loaded successfully.")
        except Exception as exc:
            err = f"Failed to load Model 3: {exc}"
            self._load_errors["model_3"] = err
            logger.error(err)
            if fail_loudly:
                raise

        # Model 4: Body Shape Clustering (Female & Male)
        try:
            p4_f = self._resolve_model_file("model_4_cluster_female.joblib")
            self.model_4_female = joblib.load(p4_f)
            self.model_4_female_meta = self._load_json_metadata("model_4_cluster_female.json")
            logger.info("✓ Model 4 Female (Body Clustering) loaded successfully.")
        except Exception as exc:
            err = f"Failed to load Model 4 Female: {exc}"
            self._load_errors["model_4_female"] = err
            logger.error(err)
            if fail_loudly:
                raise

        try:
            p4_m = self._resolve_model_file("model_4_cluster_male.joblib")
            self.model_4_male = joblib.load(p4_m)
            self.model_4_male_meta = self._load_json_metadata("model_4_cluster_male.json")
            logger.info("✓ Model 4 Male (Body Clustering) loaded successfully.")
        except Exception as exc:
            err = f"Failed to load Model 4 Male: {exc}"
            self._load_errors["model_4_male"] = err
            logger.error(err)
            if fail_loudly:
                raise

        # Model 5: Fit Feedback / Return Risk Classifier
        try:
            p5 = self._resolve_model_file("model_5_feedback.joblib")
            self.model_5 = joblib.load(p5)
            self.model_5_meta = self._load_json_metadata("model_5_feedback.json")
            logger.info("✓ Model 5 (Feedback / Return Risk) loaded successfully.")
        except Exception as exc:
            err = f"Failed to load Model 5: {exc}"
            self._load_errors["model_5"] = err
            logger.error(err)
            if fail_loudly:
                raise

        self._is_loaded = len(self._load_errors) == 0

    def ensure_loaded(self) -> None:
        if not self._is_loaded and not (self.model_1 and self.model_2 and self.model_3):
            self.load_all()

    # ------------------------------------------------------------------------
    # STATUS & VALIDATION
    # ------------------------------------------------------------------------
    def get_models_status(self) -> Dict[str, Any]:
        """Return readiness and sample prediction verification for each model."""
        self.ensure_loaded()
        status_report = {}

        # Check Model 1
        m1_ok, m1_msg = False, ""
        if self.model_1 is not None:
            try:
                res1 = self.predict_size({"height": 168, "weight": 60, "bust": 90, "waist": 70, "hip": 95}, {"category": "top"})
                m1_ok = bool(res1.get("size"))
                m1_msg = f"Sample prediction: {res1.get('size')} (confidence: {res1.get('confidence')})"
            except Exception as e:
                m1_msg = f"Error: {e}"
        else:
            m1_msg = self._load_errors.get("model_1", "Not loaded")

        status_report["model_1_size"] = {
            "name": "Model 1: Clothing Size Classifier",
            "file": "model_1_size.joblib",
            "algorithm": self.model_1_meta.get("algorithm", "XGBoost"),
            "target": "size_label (XS..XXXL)",
            "loaded": self.model_1 is not None,
            "verified": m1_ok,
            "detail": m1_msg,
        }

        # Check Model 2
        m2_ok, m2_msg = False, ""
        if self.model_2 is not None:
            try:
                res2 = self.predict_fit({"height": 168, "weight": 60, "bust": 90, "waist": 70, "hip": 95}, {"category": "top", "size": "M"})
                m2_ok = bool(res2.get("fit_class"))
                m2_msg = f"Sample prediction: {res2.get('fit_class')} (probs: {res2.get('probabilities')})"
            except Exception as e:
                m2_msg = f"Error: {e}"
        else:
            m2_msg = self._load_errors.get("model_2", "Not loaded")

        status_report["model_2_fit"] = {
            "name": "Model 2: Fit Recommendation Classifier",
            "file": "model_2_fit.joblib",
            "algorithm": self.model_2_meta.get("algorithm", "Calibrated RandomForest"),
            "target": "fit_class (tight / fit / loose)",
            "loaded": self.model_2 is not None,
            "verified": m2_ok,
            "detail": m2_msg,
        }

        # Check Model 3
        m3_ok, m3_msg = False, ""
        if self.model_3 is not None:
            try:
                res3 = self.predict_garment_dims(brand="FITMATE", category="top", size="M")
                m3_ok = bool(res3.get("dims_cm"))
                m3_msg = f"Sample prediction: dims={res3.get('dims_cm')}"
            except Exception as e:
                m3_msg = f"Error: {e}"
        else:
            m3_msg = self._load_errors.get("model_3", "Not loaded")

        status_report["model_3_garment"] = {
            "name": "Model 3: Garment Dimensions Multi-Regressor",
            "file": "model_3_garment.joblib",
            "algorithm": "XGBoost + RandomForest Multi-Regressor",
            "target": "dims_cm (bust, waist, length, inseam)",
            "loaded": self.model_3 is not None,
            "verified": m3_ok,
            "detail": m3_msg,
        }

        # Check Model 4
        m4_ok, m4_msg = False, ""
        if self.model_4_female is not None and self.model_4_male is not None:
            try:
                res4_f = self.predict_body_shape(gender="female", height_cm=162.0, weight_kg=58.0, waist_cm=72.0)
                res4_m = self.predict_body_shape(gender="male", height_cm=178.0, weight_kg=78.0, waist_cm=86.0)
                m4_ok = bool(res4_f.get("body_shape") and res4_m.get("body_shape"))
                m4_msg = f"Female: '{res4_f.get('body_shape')}', Male: '{res4_m.get('body_shape')}'"
            except Exception as e:
                m4_msg = f"Error: {e}"
        else:
            m4_msg = f"Female: {self._load_errors.get('model_4_female')}, Male: {self._load_errors.get('model_4_male')}"

        status_report["model_4_body_shape"] = {
            "name": "Model 4: Body Pattern Clustering (Female & Male)",
            "file": "model_4_cluster_female.joblib & model_4_cluster_male.joblib",
            "algorithm": "KMeans NHANES Clustering",
            "target": "body_shape archetype cluster",
            "loaded": self.model_4_female is not None and self.model_4_male is not None,
            "verified": m4_ok,
            "detail": m4_msg,
        }

        # Check Model 5
        m5_ok, m5_msg = False, ""
        if self.model_5 is not None:
            try:
                res5 = self.predict_fit_risk(size=8, rating=4.5, height_cm=165.0, weight_kg=60.0, waist_cm=72.0, hips_cm=96.0, category="dress")
                m5_ok = bool(res5.get("predicted_fit"))
                m5_msg = f"Sample prediction: {res5.get('predicted_fit')} (risk: {res5.get('risk_level')})"
            except Exception as e:
                m5_msg = f"Error: {e}"
        else:
            m5_msg = self._load_errors.get("model_5", "Not loaded")

        status_report["model_5_feedback"] = {
            "name": "Model 5: Fit Feedback / Return Risk Classifier",
            "file": "model_5_feedback.joblib",
            "algorithm": self.model_5_meta.get("selected_algorithm", "Calibrated RandomForest"),
            "target": "fit feedback / return risk (good_fit, too_tight, too_loose)",
            "loaded": self.model_5 is not None,
            "verified": m5_ok,
            "detail": m5_msg,
        }

        all_ok = all(v["verified"] for v in status_report.values())
        return {
            "status": "all_models_operational" if all_ok else "partially_degraded",
            "total_models": 5,
            "models_ready": sum(1 for v in status_report.values() if v["verified"]),
            "models": status_report,
        }

    # ------------------------------------------------------------------------
    # VALIDATION UTILITY
    # ------------------------------------------------------------------------
    @staticmethod
    def validate_measurements_bounds(measurements: Dict[str, Any]) -> None:
        """Validate input body measurements are within sensible biological bounds."""
        h = measurements.get("height_cm")
        if h is not None and not np.isnan(h):
            if h < 100 or h > 250:
                raise ValueError(f"Height {h:.1f} cm is outside human biological range (100 - 250 cm).")

        w = measurements.get("weight_kg")
        if w is not None and not np.isnan(w):
            if w < 25 or w > 250:
                raise ValueError(f"Weight {w:.1f} kg is outside valid adult range (25 - 250 kg).")

        age = measurements.get("age")
        if age is not None and not np.isnan(age):
            if age < 10 or age > 120:
                raise ValueError(f"Age {age} is outside valid range (10 - 120 years).")

        for col in ["bust_cm", "waist_cm", "hip_cm", "hips_cm"]:
            v = measurements.get(col)
            if v is not None and not np.isnan(v):
                if v < 40 or v > 220:
                    raise ValueError(f"{col} value {v:.1f} cm is outside realistic apparel measurement range (40 - 220 cm).")

    # ------------------------------------------------------------------------
    # MODEL 1: SIZE PREDICTION
    # ------------------------------------------------------------------------
    def predict_size(self, profile: Dict[str, Any], product: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """Predict standard apparel size (XS..XXXL) using Model 1 XGBoost."""
        self.ensure_loaded()
        if self.model_1 is None:
            raise RuntimeError(f"Model 1 not loaded: {self._load_errors.get('model_1')}")

        if not isinstance(profile, dict):
            raise ValueError("Profile must be a dictionary of user measurements.")
        if not profile:
            raise ValueError("At least one body measurement (height, weight, bust, waist, or hip) must be provided.")

        height_raw = profile.get("height")
        weight_raw = profile.get("weight")
        age_raw = profile.get("age")
        bust_raw = profile.get("bust")
        waist_raw = profile.get("waist")
        hip_raw = profile.get("hip") if profile.get("hip") is not None else profile.get("hips")

        height_cm = parse_height_to_cm(height_raw) if height_raw is not None else np.nan
        weight_kg = parse_weight_to_kg(weight_raw) if weight_raw is not None else np.nan
        age = float(age_raw) if age_raw is not None and str(age_raw).strip() != "" else np.nan

        bust_cm = np.nan
        if bust_raw is not None:
            _, b_cm, _ = parse_bust_size(bust_raw)
            bust_cm = b_cm

        waist_cm = parse_circumference_to_cm(waist_raw) if waist_raw is not None else np.nan
        hip_cm = parse_circumference_to_cm(hip_raw) if hip_raw is not None else np.nan

        # Validate bounds
        meas = {
            "height_cm": height_cm,
            "weight_kg": weight_kg,
            "age": age,
            "bust_cm": bust_cm,
            "waist_cm": waist_cm,
            "hip_cm": hip_cm,
        }
        self.validate_measurements_bounds(meas)

        primary_meas = [v for k, v in [("height", height_cm), ("weight", weight_kg), ("bust", bust_cm), ("waist", waist_cm), ("hip", hip_cm)] if not np.isnan(v)]
        if not primary_meas:
            raise ValueError("At least one body measurement (height, weight, bust, waist, or hip) must be provided.")

        prod = product or {}
        cat = standardise_category(prod.get("category", "top"))
        fit_pref = str(profile.get("fit_preference", "fit")).strip().lower()
        if fit_pref in ["slim", "tight"]:
            fit_pref = "tight"
        elif fit_pref in ["relaxed", "loose"]:
            fit_pref = "loose"
        else:
            fit_pref = "fit"

        row = {
            "height_cm": height_cm,
            "weight_kg": weight_kg,
            "age": age,
            "bust_cm": bust_cm,
            "waist_cm": waist_cm,
            "hip_cm": hip_cm,
            "height_cm_was_missing": int(np.isnan(height_cm)),
            "weight_kg_was_missing": int(np.isnan(weight_kg)),
            "age_was_missing": int(np.isnan(age)),
            "bust_cm_was_missing": int(np.isnan(bust_cm)),
            "waist_cm_was_missing": int(np.isnan(waist_cm)),
            "hip_cm_was_missing": int(np.isnan(hip_cm)),
            "category": cat,
            "fit_preference": fit_pref,
        }
        df_in = pd.DataFrame([row])

        pred_idx = self.model_1.predict(df_in)[0]
        probs_raw = self.model_1.predict_proba(df_in)[0]
        classes = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]
        predicted_size = classes[pred_idx]

        probs_dict = {cls_name: round(float(prob), 4) for cls_name, prob in zip(classes, probs_raw)}
        confidence = round(float(probs_raw[pred_idx]), 4)

        # Determine alternate size (second highest probability)
        sorted_probs = sorted(probs_dict.items(), key=lambda x: x[1], reverse=True)
        alternate_size = sorted_probs[1][0] if len(sorted_probs) > 1 and sorted_probs[1][1] > 0.15 else None

        return {
            "size": predicted_size,
            "probabilities": probs_dict,
            "confidence": confidence,
            "alternate_size": alternate_size,
            "source": "model_1_xgb",
        }

    # ------------------------------------------------------------------------
    # MODEL 2: FIT RECOMMENDATION (tight, fit, loose)
    # ------------------------------------------------------------------------
    def predict_fit(self, profile: Dict[str, Any], garment: Dict[str, Any]) -> Dict[str, Any]:
        """Predict fit class (tight / fit / loose) and probabilities using Model 2."""
        self.ensure_loaded()
        if self.model_2 is None:
            raise RuntimeError(f"Model 2 not loaded: {self._load_errors.get('model_2')}")

        preprocessor = self.model_2["preprocessor"]
        calibrated_model = self.model_2["calibrated_model"]
        classes = self.model_2["classes"]

        raw_size = garment.get("size")
        if raw_size is None:
            raise ValueError("Garment size must be specified (e.g. size='M' or size=8).")
        norm_size = normalise_size_label(raw_size)
        if pd.isnull(norm_size):
            raise ValueError(f"Unrecognized garment size: '{raw_size}'. Must map to XXS-XXXL.")

        # Parse profile
        height_raw = profile.get("height")
        weight_raw = profile.get("weight")
        age_raw = profile.get("age")
        bust_raw = profile.get("bust")
        waist_raw = profile.get("waist")
        hip_raw = profile.get("hip") if profile.get("hip") is not None else profile.get("hips")

        height_cm = parse_height_to_cm(height_raw) if height_raw is not None else np.nan
        weight_kg = parse_weight_to_kg(weight_raw) if weight_raw is not None else np.nan
        age = float(age_raw) if age_raw is not None and str(age_raw).strip() != "" else np.nan

        bust_cm = np.nan
        if bust_raw is not None:
            _, b_cm, _ = parse_bust_size(bust_raw)
            bust_cm = b_cm
        waist_cm = parse_circumference_to_cm(waist_raw) if waist_raw is not None else np.nan
        hip_cm = parse_circumference_to_cm(hip_raw) if hip_raw is not None else np.nan

        meas = {
            "height_cm": height_cm,
            "weight_kg": weight_kg,
            "age": age,
            "bust_cm": bust_cm,
            "waist_cm": waist_cm,
            "hip_cm": hip_cm,
        }
        self.validate_measurements_bounds(meas)

        primary_meas = [v for k, v in [("height", height_cm), ("weight", weight_kg), ("bust", bust_cm), ("waist", waist_cm), ("hip", hip_cm)] if not np.isnan(v)]
        if not primary_meas:
            raise ValueError("At least one body measurement (height, weight, bust, waist, or hip) must be provided.")

        cat = standardise_category(garment.get("category", "top"))
        row = {
            "height_cm": height_cm,
            "weight_kg": weight_kg,
            "age": age,
            "bust_cm": bust_cm,
            "waist_cm": waist_cm,
            "hip_cm": hip_cm,
            "height_cm_was_missing": int(np.isnan(height_cm)),
            "weight_kg_was_missing": int(np.isnan(weight_kg)),
            "age_was_missing": int(np.isnan(age)),
            "bust_cm_was_missing": int(np.isnan(bust_cm)),
            "waist_cm_was_missing": int(np.isnan(waist_cm)),
            "hip_cm_was_missing": int(np.isnan(hip_cm)),
            "category": cat,
            "size_label": norm_size,
        }
        df_in = pd.DataFrame([row])
        X_proc = preprocessor.transform(df_in)
        probs = calibrated_model.predict_proba(X_proc)[0]

        p_tight = float(probs[0])
        p_fit = float(probs[1])
        p_loose = float(probs[2])

        if p_tight >= 0.35 and p_tight > p_loose:
            pred_class = "tight"
        elif p_loose >= 0.35 and p_loose > p_tight:
            pred_class = "loose"
        else:
            pred_class = classes[int(np.argmax(probs))]

        return {
            "fit_class": pred_class,
            "probabilities": {
                "tight": round(p_tight, 4),
                "fit": round(p_fit, 4),
                "loose": round(p_loose, 4),
            },
            "source": "model_2_rf",
        }

    # ------------------------------------------------------------------------
    # MODEL 3: ESTIMATED GARMENT DIMENSIONS
    # ------------------------------------------------------------------------
    def predict_garment_dims(
        self,
        brand: str,
        category: str,
        size: str,
        extra: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """Predict garment dimensions in cm (bust, waist, length, inseam) with intervals."""
        self.ensure_loaded()
        if self.model_3 is None:
            raise RuntimeError(f"Model 3 not loaded: {self._load_errors.get('model_3')}")

        brand_clean = str(brand).strip().lower() if brand else "unknown"
        cat_clean = standardise_category(category)
        size_norm = normalise_size_label(size)
        if pd.isnull(size_norm):
            size_norm = "M"

        row = pd.DataFrame([{"brand": brand_clean, "category": cat_clean, "size_label": size_norm}])
        trained_models = self.model_3["trained_models"]

        dims_cm = {}
        interval_cm = {}

        for dim_name, info in trained_models.items():
            pipe = info["pipeline"]
            val = float(pipe.predict(row)[0])
            val = max(20.0, round(val, 1))
            dims_cm[dim_name] = val
            interval_cm[dim_name] = info["interval_cm"]

        return {
            "dims_cm": dims_cm,
            "interval": interval_cm,
            "estimated": True,
            "source": "model_3_garment",
        }

    # ------------------------------------------------------------------------
    # MODEL 4: BODY PATTERN CLUSTERING
    # ------------------------------------------------------------------------
    def predict_body_shape(
        self,
        gender: str,
        height_cm: float,
        weight_kg: float,
        waist_cm: float,
    ) -> Dict[str, Any]:
        """Classify user anthropometric body shape cluster using NHANES KMeans models."""
        self.ensure_loaded()
        self.validate_measurements_bounds({"height_cm": height_cm, "weight_kg": weight_kg, "waist_cm": waist_cm})

        is_male = str(gender).strip().lower() in ["men", "man", "male"]
        model_bundle = self.model_4_male if is_male else self.model_4_female
        gender_tag = "male" if is_male else "female"

        if model_bundle is None:
            raise RuntimeError(f"Model 4 ({gender_tag}) not loaded: {self._load_errors.get(f'model_4_{gender_tag}')}")

        scaler = model_bundle["scaler"]
        kmeans = model_bundle["kmeans"]
        cluster_labels = model_bundle["cluster_labels"]
        cluster_profiles = model_bundle.get("cluster_profiles", [])
        ood_threshold = model_bundle.get("ood_threshold", 2.5)

        df_in = pd.DataFrame([{"height_cm": float(height_cm), "weight_kg": float(weight_kg), "waist_cm": float(waist_cm)}])
        X_scaled = scaler.transform(df_in)
        cluster_id = int(kmeans.predict(X_scaled)[0])

        # Cluster label lookup (handle int/str key)
        label = cluster_labels.get(cluster_id) or cluster_labels.get(str(cluster_id)) or f"Archetype {cluster_id}"

        # Calculate distance to center
        center = kmeans.cluster_centers_[cluster_id]
        distance = float(np.linalg.norm(X_scaled[0] - center))
        is_outlier = distance > ood_threshold

        waist_height_ratio = round(waist_cm / height_cm, 3) if height_cm > 0 else 0.0

        profile_desc = next((p for p in cluster_profiles if p.get("cluster_id") == cluster_id), {})

        return {
            "cluster_id": cluster_id,
            "body_shape": label,
            "gender": gender_tag,
            "waist_to_height_ratio": waist_height_ratio,
            "is_outlier": is_outlier,
            "cluster_distance": round(distance, 4),
            "profile_summary": profile_desc,
            "source": f"model_4_kmeans_{gender_tag}",
        }

    # ------------------------------------------------------------------------
    # MODEL 5: FIT FEEDBACK / RETURN RISK CLASSIFIER
    # ------------------------------------------------------------------------
    def predict_fit_risk(
        self,
        size: float,
        rating: float = 4.0,
        height_cm: float = 168.0,
        weight_kg: float = 62.0,
        waist_cm: float = 72.0,
        hips_cm: float = 96.0,
        category: str = "dress",
        bust_band: float = 34.0,
        cup_size: str = "c",
        body_type: str = "hourglass",
        size_deviation: float = 0.0,
    ) -> Dict[str, Any]:
        """Predict user satisfaction and return risk using Model 5 calibrated classifier."""
        self.ensure_loaded()
        if self.model_5 is None:
            raise RuntimeError(f"Model 5 not loaded: {self._load_errors.get('model_5')}")

        preprocessor = self.model_5["preprocessor"]
        classifier = self.model_5["calibrated_classifier"]
        rev_map = self.model_5.get("reverse_target_mapping", {0: "good_fit", 1: "too_tight", 2: "too_loose"})

        cat_clean = standardise_category(category)
        row = {
            "size": float(size),
            "rating": float(rating),
            "height_cm": float(height_cm),
            "weight_kg": float(weight_kg),
            "bust_band": float(bust_band),
            "waist_cm": float(waist_cm),
            "hips_cm": float(hips_cm),
            "size_deviation": float(size_deviation),
            "category": cat_clean,
            "cup_size": str(cup_size).lower(),
            "body_type": str(body_type).lower(),
        }
        df_in = pd.DataFrame([row])
        X_proc = preprocessor.transform(df_in)
        pred_raw = int(classifier.predict(X_proc)[0])
        probs = classifier.predict_proba(X_proc)[0]

        pred_label = rev_map.get(pred_raw, "good_fit")
        probs_dict = {
            "good_fit": round(float(probs[0]), 4),
            "too_tight": round(float(probs[1]), 4),
            "too_loose": round(float(probs[2]), 4),
        }

        # Calculate return risk based on probability of tight or loose
        risk_score = round(probs_dict["too_tight"] + probs_dict["too_loose"], 4)
        if risk_score > 0.5:
            risk_level = "high"
        elif risk_score > 0.3:
            risk_level = "moderate"
        else:
            risk_level = "low"

        return {
            "predicted_fit": pred_label,
            "risk_level": risk_level,
            "risk_score": risk_score,
            "probabilities": probs_dict,
            "confidence": round(float(probs[pred_raw]), 4),
            "source": "model_5_feedback",
        }


# Global singleton instance
default_model_service = ModelService.get_instance()
