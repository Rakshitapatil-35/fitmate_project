"""
Training script stub that builds and serializes a working scikit-learn model bundle
to `app/ml/artifacts/size_model.joblib` for end-to-end ML inference.
Run directly via: `python -m app.ml.train_stub`
"""

from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict

import joblib
import numpy as np
from sklearn.ensemble import RandomForestClassifier

from app.config import settings
from app.ml.version import MODEL_NAME, MODEL_VERSION


def build_and_save_dummy_model(output_path: str | Path | None = None) -> Path:
    """Train a synthetic RandomForestClassifier on body/garment ease features and save via joblib."""
    target_path = Path(output_path or settings.ML_MODEL_PATH)
    target_path.parent.mkdir(parents=True, exist_ok=True)

    rng = np.random.default_rng(seed=42)
    # Features: [primary_body_cm, secondary_body_cm, stretch_pct, fit_pref_code (0=slim,1=regular,2=relaxed)]
    n_samples = 300
    primary_cm = rng.uniform(72.0, 124.0, size=n_samples)
    secondary_cm = primary_cm * rng.uniform(0.78, 0.92, size=n_samples)
    stretch_pct = rng.uniform(0.0, 15.0, size=n_samples)
    fit_pref = rng.integers(0, 3, size=n_samples)

    X = np.column_stack([primary_cm, secondary_cm, stretch_pct, fit_pref])

    # Assign standard letter sizes based on primary circumference + fit preference adjustment
    effective_measure = primary_cm + (fit_pref - 1) * 3.0 - stretch_pct * 0.25
    size_labels = []
    for val in effective_measure:
        if val < 84:
            size_labels.append("XS")
        elif val < 92:
            size_labels.append("S")
        elif val < 100:
            size_labels.append("M")
        elif val < 108:
            size_labels.append("L")
        elif val < 116:
            size_labels.append("XL")
        else:
            size_labels.append("XXL")

    clf = RandomForestClassifier(n_estimators=40, max_depth=6, random_state=42)
    clf.fit(X, np.array(size_labels))

    artifact_bundle: Dict[str, Any] = {
        "model_name": MODEL_NAME,
        "model_version": MODEL_VERSION,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "feature_names": ["primary_body_cm", "secondary_body_cm", "stretch_pct", "fit_pref_code"],
        "classifier": clf,
        "classes": list(clf.classes_),
    }

    joblib.dump(artifact_bundle, target_path)
    return target_path


if __name__ == "__main__":
    saved = build_and_save_dummy_model()
    print(f"Saved trained ML model artifact to: {saved.resolve()}")
