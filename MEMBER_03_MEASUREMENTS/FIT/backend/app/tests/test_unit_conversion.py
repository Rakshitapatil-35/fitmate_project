"""Unit tests for inch-to-cm, cm-to-inch, and pound-to-kg conversion utilities and API."""

import pytest
from fastapi.testclient import TestClient

from app.services.unit_conversion import (
    cm_to_inches,
    convert_to_cm,
    convert_weight_to_kg,
    inches_to_cm,
    lbs_to_kg,
)


def test_inches_to_cm_exact() -> None:
    """Verify 1 inch = 2.54 cm and standard adult chest/waist conversions."""
    assert inches_to_cm(1.0) == 2.54
    assert inches_to_cm(38.0) == 96.52
    assert inches_to_cm(32.5) == 82.55


def test_cm_to_inches_roundtrip() -> None:
    """Verify cm_to_inches inverses inches_to_cm accurately."""
    assert cm_to_inches(2.54) == 1.0
    assert cm_to_inches(101.6) == 40.0


def test_lbs_to_kg_conversion() -> None:
    """Verify pounds to kilograms conversion."""
    assert lbs_to_kg(154.32) == 70.0
    assert convert_weight_to_kg(75.0, "kg") == 75.0
    assert convert_weight_to_kg(None, "lbs") is None


def test_invalid_unit_raises_error() -> None:
    """Verify negative values and unknown units raise ValueError."""
    with pytest.raises(ValueError):
        inches_to_cm(0)
    with pytest.raises(ValueError):
        convert_to_cm(90.0, "yards")


def test_conversion_api_endpoint(client: TestClient) -> None:
    """Verify POST /api/v1/measurements/convert converts inches to cm."""
    resp = client.post(
        "/api/v1/measurements/convert",
        json={"value": 40.0, "from_unit": "in", "to_unit": "cm"},
    )
    assert resp.status_code == 200
    data = resp.json()
    assert data["converted_value"] == 101.6
    assert data["to_unit"] == "cm"
