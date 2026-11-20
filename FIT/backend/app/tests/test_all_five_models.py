"""
Unit and API integration test suite for ALL 5 FITMATE ML Models:
  - Model 1: XGBoost Size Classifier (XXS..XXXL)
  - Model 2: Calibrated RandomForest Fit Classifier (tight / fit / loose)
  - Model 3: Garment Dimensions Multi-Regressor (bust, waist, length, inseam)
  - Model 4: Body Archetype KMeans Clustering (Female & Male NHANES models)
  - Model 5: Fit Feedback / Return Risk Classifier (good_fit / too_tight / too_loose)
  - Status endpoint: /api/v1/models/status
  - Validation & domain range boundary tests
"""

import pytest
from app.services.model_service import default_model_service
from app.tests.conftest import SyncASGITestClient
from app.main import app

client = SyncASGITestClient(app)


# ============================================================================
# 1. INDIVIDUAL MODEL INFERENCE UNIT TESTS
# ============================================================================

def test_model_1_inference():
    """Model 1: Test clothing size prediction and output bounds."""
    res = default_model_service.predict_size(
        profile={"height": 168.0, "weight": 62.0, "age": 28, "bust": 92.0, "waist": 74.0, "hip": 98.0},
        product={"category": "top"},
    )
    assert "size" in res
    assert res["size"] in ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]
    assert "probabilities" in res
    assert len(res["probabilities"]) == 7
    assert pytest.approx(sum(res["probabilities"].values()), abs=0.02) == 1.0
    assert 0.0 <= res["confidence"] <= 1.0
    assert res["source"] == "model_1_xgb"


def test_model_2_inference():
    """Model 2: Test fit recommendation (tight / fit / loose)."""
    res = default_model_service.predict_fit(
        profile={"height": 168.0, "weight": 62.0, "age": 28, "bust": 92.0, "waist": 74.0, "hip": 98.0},
        garment={"category": "top", "size": "M"},
    )
    assert "fit_class" in res
    assert res["fit_class"] in ["tight", "fit", "loose"]
    assert "probabilities" in res
    probs = res["probabilities"]
    assert "tight" in probs and "fit" in probs and "loose" in probs
    assert pytest.approx(sum(probs.values()), abs=0.02) == 1.0
    assert res["source"] == "model_2_rf"


def test_model_3_inference():
    """Model 3: Test garment dimensions regression."""
    res = default_model_service.predict_garment_dims(brand="FITMATE", category="top", size="M")
    assert "dims_cm" in res
    dims = res["dims_cm"]
    assert "bust_cm" in dims
    assert "waist_cm" in dims
    assert "length_cm" in dims
    assert "inseam_cm" in dims
    assert dims["bust_cm"] >= 20.0
    assert dims["waist_cm"] >= 20.0
    assert res["estimated"] is True
    assert res["source"] == "model_3_garment"


def test_model_4_female_inference():
    """Model 4 Female: Test anthropometric body clustering."""
    res = default_model_service.predict_body_shape(gender="female", height_cm=160.0, weight_kg=56.0, waist_cm=70.0)
    assert "cluster_id" in res
    assert res["cluster_id"] in [0, 1, 2, 3]
    assert "body_shape" in res
    assert len(res["body_shape"]) > 0
    assert res["gender"] == "female"
    assert res["waist_to_height_ratio"] > 0
    assert res["source"] == "model_4_kmeans_female"


def test_model_4_male_inference():
    """Model 4 Male: Test anthropometric body clustering."""
    res = default_model_service.predict_body_shape(gender="male", height_cm=180.0, weight_kg=80.0, waist_cm=88.0)
    assert "cluster_id" in res
    assert res["cluster_id"] in [0, 1, 2, 3]
    assert "body_shape" in res
    assert len(res["body_shape"]) > 0
    assert res["gender"] == "male"
    assert res["source"] == "model_4_kmeans_male"


def test_model_5_inference():
    """Model 5: Test fit feedback / return risk prediction."""
    res = default_model_service.predict_fit_risk(
        size=8.0,
        rating=4.0,
        height_cm=165.0,
        weight_kg=60.0,
        waist_cm=72.0,
        hips_cm=96.0,
        category="dress",
    )
    assert "predicted_fit" in res
    assert res["predicted_fit"] in ["good_fit", "too_tight", "too_loose"]
    assert "risk_level" in res
    assert res["risk_level"] in ["low", "moderate", "high"]
    assert "risk_score" in res
    assert 0.0 <= res["risk_score"] <= 1.0
    assert res["source"] == "model_5_feedback"


# ============================================================================
# 2. STATUS & HEALTH ENDPOINT TESTS
# ============================================================================

def test_models_status_endpoint():
    """Test /api/v1/models/status reports all 5 models as loaded and verified."""
    resp = client.get("/api/v1/models/status")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "all_models_operational"
    assert data["total_models"] == 5
    assert data["models_ready"] == 5
    models = data["models"]
    assert models["model_1_size"]["loaded"] is True
    assert models["model_2_fit"]["loaded"] is True
    assert models["model_3_garment"]["loaded"] is True
    assert models["model_4_body_shape"]["loaded"] is True
    assert models["model_5_feedback"]["loaded"] is True


# ============================================================================
# 3. REST API ENDPOINT TESTS FOR ALL MODELS
# ============================================================================

def test_api_predict_size():
    payload = {
        "profile": {"height": "5ft 8in", "weight": "140 lbs", "age": 28, "bust": "34d"},
        "product": {"category": "dress"},
    }
    resp = client.post("/api/v1/predict/size", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "size" in data
    assert data["size"] in ["XS", "S", "M", "L", "XL", "XXL", "XXXL"]


def test_api_predict_fit():
    payload = {
        "profile": {"height": 172.0, "weight": 65.0, "age": 26, "bust": "34c"},
        "garment": {"category": "dress", "size": "L"},
    }
    resp = client.post("/api/v1/predict/fit", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["fit_class"] in ["tight", "fit", "loose"]


def test_api_predict_garment_dims():
    payload = {"brand": "FITMATE", "category": "top", "size": "M"}
    resp = client.post("/api/v1/predict/garment-dims", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "dims_cm" in data
    assert data["dims_cm"]["bust_cm"] > 0


def test_api_predict_body_shape():
    payload = {"gender": "female", "height_cm": 164.0, "weight_kg": 59.0, "waist_cm": 72.0}
    resp = client.post("/api/v1/predict/body-shape", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "body_shape" in data
    assert data["cluster_id"] in [0, 1, 2, 3]


def test_api_predict_fit_risk():
    payload = {
        "size": 8.0,
        "rating": 4.5,
        "height_cm": 166.0,
        "weight_kg": 61.0,
        "waist_cm": 73.0,
        "hips_cm": 97.0,
        "category": "dress",
    }
    resp = client.post("/api/v1/predict/fit-risk", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["predicted_fit"] in ["good_fit", "too_tight", "too_loose"]
    assert data["risk_level"] in ["low", "moderate", "high"]


# ============================================================================
# 4. ERROR HANDLING & BOUNDARY VALIDATION TESTS
# ============================================================================

def test_api_validation_out_of_range():
    # Impossible height (350 cm)
    payload = {"profile": {"height": 350, "weight": 60}}
    resp = client.post("/api/v1/predict/size", json=payload)
    assert resp.status_code == 422


def test_api_validation_empty_profile():
    payload = {"profile": {}}
    resp = client.post("/api/v1/predict/size", json=payload)
    assert resp.status_code == 422


def test_api_validation_invalid_size():
    payload = {"profile": {"height": 165, "weight": 60}, "garment": {"category": "top", "size": "NONEXISTENT_XYZ"}}
    resp = client.post("/api/v1/predict/fit", json=payload)
    assert resp.status_code == 422
