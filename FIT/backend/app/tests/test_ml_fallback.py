"""Tests for ML integration, output validation, automatic rule-based fallback, and prediction_logs."""

from pathlib import Path
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.ml.model_loader import ModelLoader
from app.ml.predictor import MLPredictor
from app.models.recommendation import PredictionLog
from app.services.ml_client import MLRecommendationClient


SAMPLE_GARMENT_ROWS = [
    {"size_label": "S", "chest_bust_cm": 100.0, "shoulder_cm": 44.0, "sleeve_cm": 63.5, "torso_cm": 70.0},
    {"size_label": "M", "chest_bust_cm": 106.5, "shoulder_cm": 46.5, "sleeve_cm": 65.0, "torso_cm": 72.0},
    {"size_label": "L", "chest_bust_cm": 113.0, "shoulder_cm": 48.5, "sleeve_cm": 66.5, "torso_cm": 74.0},
]
SAMPLE_BODY = {"chest_bust": 98.0, "shoulder": 45.0, "sleeve": 64.0, "torso": 68.0}


def test_ml_prediction_and_logging_success(db_session: Session) -> None:
    """Verify ML predictor runs end-to-end and logs latency and model version in prediction_logs."""
    client = MLRecommendationClient()
    ranked, explanation, meta, pred_log = client.recommend_with_fallback(
        db=db_session,
        category_code="mens_tops",
        body_measurements=SAMPLE_BODY,
        garment_rows=SAMPLE_GARMENT_ROWS,
        allowed_sizes=["S", "M", "L"],
        fit_preference="regular",
        product_stretch_pct=2.0,
        use_ml=True,
    )
    db_session.commit()

    assert len(ranked) == 3
    assert pred_log.id is not None
    assert pred_log.latency_ms >= 0.0
    assert pred_log.model_version is not None

    stored_log = db_session.scalar(select(PredictionLog).where(PredictionLog.id == pred_log.id))
    assert stored_log is not None
    assert stored_log.predicted_size in ("S", "M", "L")


def test_ml_fallback_when_model_file_unavailable(db_session: Session, tmp_path: Path) -> None:
    """If the ML model file does not exist and auto-create is disabled, fallback to rule-based engine."""
    missing_path = tmp_path / "nonexistent_model.joblib"
    broken_loader = ModelLoader(model_path=str(missing_path))
    predictor = MLPredictor(loader=broken_loader, auto_create_if_missing=False)
    client = MLRecommendationClient(predictor=predictor)

    ranked, explanation, meta, pred_log = client.recommend_with_fallback(
        db=db_session,
        category_code="mens_tops",
        body_measurements=SAMPLE_BODY,
        garment_rows=SAMPLE_GARMENT_ROWS,
        allowed_sizes=["S", "M", "L"],
        fit_preference="regular",
        use_ml=True,
    )
    db_session.commit()

    assert meta["fallback_used"] is True
    assert meta["method_used"] == "rule_based_fallback"
    assert pred_log.fallback_used is True
    assert "unavailable" in (pred_log.fallback_reason or "").lower()
    assert ranked[0].size_label == "M"


def test_ml_fallback_when_allowed_sizes_incompatible(db_session: Session) -> None:
    """If product uses numeric sizes not in the ML classifier's classes, fallback cleanly to rules."""
    numeric_rows = [
        {"size_label": "38", "chest_bust_cm": 100.0, "shoulder_cm": 44.0, "sleeve_cm": 63.5, "torso_cm": 70.0},
        {"size_label": "40", "chest_bust_cm": 106.5, "shoulder_cm": 46.5, "sleeve_cm": 65.0, "torso_cm": 72.0},
    ]
    client = MLRecommendationClient()
    ranked, explanation, meta, pred_log = client.recommend_with_fallback(
        db=db_session,
        category_code="mens_tops",
        body_measurements=SAMPLE_BODY,
        garment_rows=numeric_rows,
        allowed_sizes=["38", "40"],
        fit_preference="regular",
        use_ml=True,
    )
    assert meta["fallback_used"] is True
    assert ranked[0].size_label == "40"
