"""Unit and API tests for body measurement validation, unit normalization, and multi-profile CRUD."""

import pytest
from fastapi.testclient import TestClient

from app.core.exceptions import AppException
from app.services.unit_conversion import normalize_and_validate_measurements


def test_realistic_range_validation_rejects_outliers() -> None:
    """Measurements outside human anatomical bounds must raise AppException(422)."""
    with pytest.raises(AppException) as exc_info:
        normalize_and_validate_measurements(
            raw_measurements={"chest_bust": 250.0, "waist": 30.0},
            unit="cm",
        )
    assert exc_info.value.status_code == 422
    assert "chest_bust" in exc_info.value.message
    assert "waist" in exc_info.value.message


def test_underbust_must_be_smaller_than_bust() -> None:
    """Cross-field validation must reject underbust >= chest_bust."""
    with pytest.raises(AppException) as exc_info:
        normalize_and_validate_measurements(
            raw_measurements={"chest_bust": 88.0, "underbust": 92.0},
            unit="cm",
            gender="female",
        )
    assert "underbust" in exc_info.value.message


def test_category_required_fields_validation() -> None:
    """Requesting validation for mens_bottoms without waist/hips/inseam must fail clearly."""
    with pytest.raises(AppException) as exc_info:
        normalize_and_validate_measurements(
            raw_measurements={"chest_bust": 100.0},
            unit="cm",
            target_category="mens_bottoms",
        )
    assert "Missing required measurements for 'mens_bottoms'" in exc_info.value.message


def test_inches_input_stored_as_cm_via_api(client: TestClient) -> None:
    """Creating a measurement profile in inches ('in') must convert and persist values in cm."""
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "alex@sizerec.example.com", "password": "UserPass123"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/v1/measurements",
        headers=headers,
        json={
            "profile_name": "Inches Test Profile",
            "gender": "male",
            "fit_preference": "slim",
            "unit": "in",
            "weight_unit": "lbs",
            "chest_bust": 40.0,
            "shoulder": 18.0,
            "waist": 32.0,
            "hips": 39.0,
            "inseam": 31.0,
            "weight": 165.0,
        },
    )
    assert create_resp.status_code == 201
    profile = create_resp.json()
    assert profile["original_unit"] == "in"
    assert profile["chest_bust_cm"] == 101.6
    assert profile["waist_cm"] == 81.28
    assert profile["fit_preference"] == "slim"

    # Update profile and then delete it
    pid = profile["id"]
    upd_resp = client.put(
        f"/api/v1/measurements/{pid}",
        headers=headers,
        json={"fit_preference": "relaxed", "unit": "cm", "waist": 83.0},
    )
    assert upd_resp.status_code == 200
    assert upd_resp.json()["fit_preference"] == "relaxed"
    assert upd_resp.json()["waist_cm"] == 83.0

    del_resp = client.delete(f"/api/v1/measurements/{pid}", headers=headers)
    assert del_resp.status_code == 200


def test_optional_fields_never_block_category_validation() -> None:
    """Shoulder for tops/dresses and inseam for bottoms must be optional and never block submission."""
    norm_tops, _ = normalize_and_validate_measurements(
        raw_measurements={"chest_bust": 92.0, "waist": 74.0, "height": 168.0},
        unit="cm",
        target_category="womens_tops",
    )
    assert norm_tops["chest_bust"] == 92.0
    assert norm_tops["shoulder"] is None

    norm_bottoms, _ = normalize_and_validate_measurements(
        raw_measurements={"waist": 74.0, "hips": 98.0, "height": 168.0},
        unit="cm",
        target_category="womens_bottoms",
    )
    assert norm_bottoms["waist"] == 74.0
    assert norm_bottoms["inseam"] is None

    norm_dresses, _ = normalize_and_validate_measurements(
        raw_measurements={"chest_bust": 90.0, "waist": 72.0, "hips": 96.0, "height": 166.0},
        unit="cm",
        target_category="womens_dresses",
    )
    assert norm_dresses["chest_bust"] == 90.0
    assert norm_dresses["shoulder"] is None


def test_patch_measurement_history_and_reset(client: TestClient) -> None:
    """Editing a profile via PATCH logs timestamped history and reset restores baseline values."""
    login = client.post(
        "/api/v1/auth/login",
        json={"email": "alex@sizerec.example.com", "password": "UserPass123"},
    )
    token = login.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    create_resp = client.post(
        "/api/v1/measurements",
        headers=headers,
        json={
            "profile_name": "Women's Dresses Vault",
            "gender": "female",
            "target_category": "womens_dresses",
            "fit_style": "A-line",
            "fit_preference": "regular",
            "unit": "cm",
            "chest_bust": 90.0,
            "waist": 72.0,
            "hips": 96.0,
            "height": 167.0,
            "shoulder": 39.5,
        },
    )
    assert create_resp.status_code == 201
    created = create_resp.json()
    pid = created["id"]
    assert created["target_category"] == "womens_dresses"
    assert created["fit_style"] == "A-line"
    assert len(created["history"]) == 1
    assert created["history"][0]["action"] == "created"

    # PATCH update waist and clear optional shoulder
    patch_resp = client.patch(
        f"/api/v1/measurements/{pid}",
        headers=headers,
        json={
            "unit": "cm",
            "waist": 75.0,
            "fit_style": "Bodycon",
            "clear_optional_fields": ["shoulder"],
        },
    )
    assert patch_resp.status_code == 200
    patched = patch_resp.json()
    assert patched["waist_cm"] == 75.0
    assert patched["shoulder_cm"] is None
    assert patched["fit_style"] == "Bodycon"
    assert len(patched["history"]) == 2
    assert patched["history"][0]["action"] == "updated"
    assert "waist_cm" in patched["history"][0]["changes"]

    # Reset profile to baseline
    reset_resp = client.post(f"/api/v1/measurements/{pid}/reset", headers=headers)
    assert reset_resp.status_code == 200
    reset_data = reset_resp.json()
    assert reset_data["waist_cm"] == 74.0
    assert reset_data["history"][0]["action"] == "reset"

    client.delete(f"/api/v1/measurements/{pid}", headers=headers)


def test_multi_brand_comparison_with_fit_style_and_optional_fields(client: TestClient) -> None:
    """POST /api/v1/comparison/brands evaluates all active brands with live recommendations and 5-model outputs."""
    resp = client.post(
        "/api/v1/comparison/brands",
        json={
            "gender": "female",
            "category": "womens_bottoms",
            "fit_style": "Baggy",
            "unit": "cm",
            "waist": 72.0,
            "hips": 97.0,
            "height": 166.0,
            "inseam": None,
        },
    )
    assert resp.status_code == 200
    brands = resp.json()
    assert isinstance(brands, list)
    assert len(brands) >= 6
    brand_names = {b["brand"] for b in brands}
    assert {"Zara", "H&M", "Levi's", "Uniqlo", "Mango", "NordicThread"}.issubset(brand_names)
    for b in brands:
        assert b["recommendedSize"] in {"XXS", "XS", "S", "M", "L", "XL", "XXL"}
        assert b["fitStyle"] == "Baggy"
        assert "ml_predictions" in b
        assert "body_shape" in b["ml_predictions"]
        assert "fit_risk" in b["ml_predictions"]


def test_catalog_styles_slim_rules_and_new_styles(client: TestClient) -> None:
    """Verify authoritative catalog: Slim is kept for Tops, removed from Bottoms, and all 8 new styles work."""
    cat_resp = client.get("/api/v1/comparison/catalog-styles")
    assert cat_resp.status_code == 200
    catalog = cat_resp.json()

    assert catalog["mens_tops"] == ["T-shirts", "Regular", "Slim", "Oversized", "Sweatshirts", "Jackets", "Kurta"]
    assert catalog["womens_tops"] == ["T-shirts", "Regular", "Slim", "Oversized", "Cropped", "Sweatshirts", "Jackets", "Kurta"]
    assert catalog["mens_bottoms"] == ["Straight", "Loose", "Baggy", "Trousers", "Cargo", "Track Pants", "Shorts", "Skinny"]
    assert catalog["womens_bottoms"] == ["Straight", "Loose", "Baggy", "Trousers", "Cargo", "Track Pants", "Shorts", "Skinny"]
    assert catalog["womens_dresses"] == ["Bodycon", "A-line", "Maxi", "Jumpsuit"]

    assert "Slim" in catalog["mens_tops"]
    assert "Slim" in catalog["womens_tops"]
    assert "Slim" not in catalog["mens_bottoms"]
    assert "Slim" not in catalog["womens_bottoms"]
    assert "Shift" not in catalog["womens_dresses"]

    # Reject Slim on bottoms
    bad_bottoms = client.post(
        "/api/v1/comparison/brands",
        json={"gender": "male", "category": "mens_bottoms", "fit_style": "Slim", "waist": 82, "hips": 98, "height": 178},
    )
    assert bad_bottoms.status_code == 422

    # Allow Slim on tops
    good_tops = client.post(
        "/api/v1/comparison/brands",
        json={"gender": "male", "category": "mens_tops", "fit_style": "Slim", "chest_bust": 98, "waist": 82, "height": 178},
    )
    assert good_tops.status_code == 200
    assert len(good_tops.json()) >= 7

    # Test every new style across all 7 brands with optional fields omitted
    new_style_cases = [
        ("male", "mens_tops", "T-shirts", {"chest_bust": 98.0, "waist": 82.0, "height": 178.0}),
        ("female", "womens_tops", "Sweatshirts", {"chest_bust": 90.0, "waist": 72.0, "height": 166.0}),
        ("male", "mens_tops", "Jackets", {"chest_bust": 100.0, "waist": 84.0, "height": 180.0}),
        ("female", "womens_tops", "Kurta", {"chest_bust": 92.0, "waist": 74.0, "height": 165.0}),
        ("male", "mens_bottoms", "Cargo", {"waist": 84.0, "hips": 100.0, "height": 178.0}),
        ("female", "womens_bottoms", "Track Pants", {"waist": 72.0, "hips": 96.0, "height": 167.0}),
        ("male", "mens_bottoms", "Shorts", {"waist": 82.0, "hips": 98.0, "height": 176.0}),
        ("female", "womens_dresses", "Jumpsuit", {"chest_bust": 90.0, "waist": 72.0, "hips": 97.0, "height": 168.0}),
    ]
    for gender, cat, style, meas in new_style_cases:
        resp = client.post(
            "/api/v1/comparison/brands",
            json={"gender": gender, "category": cat, "fit_style": style, "unit": "cm", **meas},
        )
        assert resp.status_code == 200, f"Failed for {cat} / {style}: {resp.text}"
        brands = resp.json()
        assert len(brands) >= 7
        for b in brands:
            assert b["fitStyle"] == style
            assert b["recommendedSize"] in {"XXS", "XS", "S", "M", "L", "XL", "XXL"}
            assert "ml_predictions" in b


def test_idempotent_bottoms_slim_migration(db_session) -> None:
    """Existing bottoms profiles with fit_style='Slim' must migrate idempotently to 'Skinny', while tops Slim stays untouched."""
    from app.models.measurement import BodyMeasurementProfile
    from app.models.user import User
    from app.services.catalog_styles import migrate_bottoms_slim_to_skinny
    from sqlalchemy import select

    user = db_session.scalar(select(User).where(User.email == "alex@sizerec.example.com"))
    assert user is not None

    bottoms_prof = BodyMeasurementProfile(
        user_id=user.id,
        profile_name="Legacy Slim Bottoms",
        gender="female",
        fit_preference="slim",
        original_unit="cm",
        target_category="womens_bottoms",
        fit_style="Slim",
        waist_cm=72.0,
        hips_cm=96.0,
        height_cm=166.0,
    )
    tops_prof = BodyMeasurementProfile(
        user_id=user.id,
        profile_name="Keep Slim Tops",
        gender="male",
        fit_preference="slim",
        original_unit="cm",
        target_category="mens_tops",
        fit_style="Slim",
        chest_bust_cm=98.0,
        waist_cm=82.0,
        height_cm=178.0,
    )
    db_session.add(bottoms_prof)
    db_session.add(tops_prof)
    db_session.commit()

    first_count = migrate_bottoms_slim_to_skinny(db_session)
    assert first_count >= 1
    db_session.refresh(bottoms_prof)
    db_session.refresh(tops_prof)
    assert bottoms_prof.fit_style == "Skinny"
    assert bottoms_prof.history[0]["action"] == "migrated"
    assert tops_prof.fit_style == "Slim"

    # Running migration a second time must be idempotent (0 new changes)
    second_count = migrate_bottoms_slim_to_skinny(db_session)
    assert second_count == 0

    db_session.delete(bottoms_prof)
    db_session.delete(tops_prof)
    db_session.commit()

