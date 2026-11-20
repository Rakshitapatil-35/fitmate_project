"""
FITMATE Test Suite
Tests unit conversions, input validation, out-of-range boundaries,
model inference, and FastAPI endpoints.
"""

import pytest
import numpy as np
from app.tests.conftest import SyncASGITestClient as TestClient

from src.utils import (
    parse_height_to_cm, parse_weight_to_kg, parse_bust_size,
    parse_inches_to_cm, normalise_size_label, standardise_category,
    map_fit_label, SIZE_ORDER, FIT_CLASSES
)
from src.predict import (
    predict_size, predict_fit, predict_garment_dims,
    get_model_1, get_model_2, get_model_3
)
from api.main import app

client = TestClient(app)

# ============================================================================
# 1. UNIT CONVERSION TESTS
# ============================================================================

def test_height_conversion():
    # Feet and inches strings
    assert parse_height_to_cm("5' 8\"") == pytest.approx(172.7, abs=0.5)
    assert parse_height_to_cm("5ft 6in") == pytest.approx(167.6, abs=0.5)
    assert parse_height_to_cm("5'10") == pytest.approx(177.8, abs=0.5)
    assert parse_height_to_cm("6' 0\"") == pytest.approx(182.9, abs=0.5)
    
    # Direct cm strings & numbers
    assert parse_height_to_cm("175 cm") == 175.0
    assert parse_height_to_cm(170.0) == 170.0
    assert parse_height_to_cm(68.0) == pytest.approx(172.7, abs=0.5)  # 68 inches

def test_weight_conversion():
    # Lbs strings
    assert parse_weight_to_kg("137lbs") == pytest.approx(62.1, abs=0.5)
    assert parse_weight_to_kg("150 lbs") == pytest.approx(68.0, abs=0.5)
    
    # Direct kg strings & numbers
    assert parse_weight_to_kg("65 kg") == 65.0
    assert parse_weight_to_kg(62.0) == 62.0
    assert parse_weight_to_kg(140.0) == pytest.approx(63.5, abs=0.5)  # 140 lbs assumed

def test_bust_size_parsing():
    underbust, bust, cup = parse_bust_size("34d")
    assert underbust == pytest.approx(86.4, abs=0.5)
    assert bust == pytest.approx(96.5, abs=0.5)
    assert cup == "d"
    
    underbust_b, bust_b, cup_b = parse_bust_size("36b")
    assert underbust_b == pytest.approx(91.4, abs=0.5)
    assert bust_b == pytest.approx(96.5, abs=0.5)
    assert cup_b == "b"

def test_size_normalisation():
    # US numeric
    assert normalise_size_label("0") == "XS"
    assert normalise_size_label(4) == "S"
    assert normalise_size_label(8) == "M"
    assert normalise_size_label(12) == "L"
    assert normalise_size_label(16) == "XL"
    assert normalise_size_label(20) == "XXL"
    assert normalise_size_label(26) == "XXXL"
    
    # Letter sizes
    assert normalise_size_label("M") == "M"
    assert normalise_size_label("xl") == "XL"
    assert normalise_size_label("Small") == "S"
    
    # UK sizes
    assert normalise_size_label("UK 8-10") == "S"
    assert normalise_size_label("UK 12") == "L"

def test_category_standardisation():
    assert standardise_category("dresses") == "dress"
    assert standardise_category("Gown") == "dress"
    assert standardise_category("t-shirt") == "top"
    assert standardise_category("tshirt") == "top"
    assert standardise_category("jeans") == "bottoms"
    assert standardise_category("Cardigan") == "outerwear"

def test_fit_label_mapping():
    assert map_fit_label("small") == "tight"
    assert map_fit_label("fit") == "fit"
    assert map_fit_label("large") == "loose"

# ============================================================================
# 2. OUT-OF-RANGE & INPUT VALIDATION TESTS
# ============================================================================

def test_out_of_range_height():
    with pytest.raises(ValueError, match="Height .* is outside human biological range"):
        predict_size({'height': 300, 'weight': 70})  # 300 cm is impossible

def test_out_of_range_weight():
    with pytest.raises(ValueError, match="Weight .* is outside valid adult range"):
        predict_size({'height': 170, 'weight': 10})   # 10 kg impossible for adult

def test_out_of_range_bust():
    with pytest.raises(ValueError, match="bust_cm value .* is outside realistic"):
        predict_size({'height': 170, 'bust': 350})

def test_empty_profile_raises_error():
    with pytest.raises(ValueError, match="At least one body measurement"):
        predict_size({})

def test_invalid_garment_size():
    with pytest.raises(ValueError, match="Unrecognized garment size"):
        predict_fit({'height': 165, 'weight': 60}, {'category': 'top', 'size': 'INVALID_XXX'})

# ============================================================================
# 3. MODEL INFERENCE TESTS (Artifact Loading & End-to-End)
# ============================================================================

def test_model_1_size_prediction():
    res = predict_size(
        profile={'height': "5' 7\"", 'weight': "135 lbs", 'age': 29, 'bust': "34c"},
        product={'category': 'dress'}
    )
    assert 'size' in res
    assert res['size'] in ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
    assert 'probabilities' in res
    assert len(res['probabilities']) == 7
    assert pytest.approx(sum(res['probabilities'].values()), abs=0.01) == 1.0
    assert 0.0 <= res['confidence'] <= 1.0

def test_model_2_fit_prediction():
    res = predict_fit(
        profile={'height': 168.0, 'weight': 62.0, 'age': 32, 'bust': "34b"},
        garment={'category': 'top', 'size': 'M'}
    )
    assert 'fit_class' in res
    assert res['fit_class'] in FIT_CLASSES
    assert 'probabilities' in res
    assert set(res['probabilities'].keys()) == {'tight', 'fit', 'loose'}
    assert pytest.approx(sum(res['probabilities'].values()), abs=0.01) == 1.0

def test_model_3_garment_dimensions_prediction():
    res = predict_garment_dims(brand='Levi\'s', category='bottoms', size='M')
    assert 'dims_cm' in res
    assert 'interval' in res
    assert res['estimated'] is True
    # Verify dimensions are positive realistic measurements
    for dim, val in res['dims_cm'].items():
        assert val > 20.0, f"{dim} was {val}, expected > 20 cm"
        assert res['interval'][dim] > 0.0

# ============================================================================
# 4. FASTAPI ENDPOINT TESTS
# ============================================================================

def test_api_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    data = resp.json()
    assert data["status"] == "ok"
    assert data["models_loaded"] is True

def test_api_predict_size():
    payload = {
        "profile": {
            "height": "5ft 8in",
            "weight": "140 lbs",
            "age": 28,
            "bust": "34d"
        },
        "product": {
            "category": "dress"
        }
    }
    resp = client.post("/predict/size", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "size" in data
    assert data["size"] in ['XS', 'S', 'M', 'L', 'XL', 'XXL', 'XXXL']
    assert "confidence" in data

def test_api_predict_fit():
    payload = {
        "profile": {
            "height": 172.0,
            "weight": 65.0,
            "age": 26,
            "bust": "34c"
        },
        "garment": {
            "category": "dress",
            "size": "L"
        }
    }
    resp = client.post("/predict/fit", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert data["fit_class"] in ['tight', 'fit', 'loose']
    assert "probabilities" in data

def test_api_predict_garment():
    payload = {
        "brand": "Abercrombie & Fitch",
        "category": "dress",
        "size": "M"
    }
    resp = client.post("/predict/garment", json=payload)
    assert resp.status_code == 200
    data = resp.json()
    assert "dims_cm" in data
    assert data["estimated"] is True

def test_api_validation_error():
    # Impossible height (350 cm)
    payload = {
        "profile": {
            "height": 350,
            "weight": 60
        }
    }
    resp = client.post("/predict/size", json=payload)
    assert resp.status_code == 422
    assert "Height 350.0 cm is outside" in resp.json()["detail"]
