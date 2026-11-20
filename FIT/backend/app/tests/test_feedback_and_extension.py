"""End-to-end tests for recommendations, fit feedback, analytics, admin CSV export, and browser extension APIs."""

from fastapi.testclient import TestClient


def get_auth_headers(client: TestClient, email: str, password: str) -> dict[str, str]:
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200
    return {"Authorization": f"Bearer {resp.json()['access_token']}"}


def test_recommendation_to_feedback_and_admin_export_flow(client: TestClient) -> None:
    """Verify full flow: create recommendation -> submit feedback -> check analytics -> export CSV as admin."""
    user_headers = get_auth_headers(client, "alex@sizerec.example.com", "UserPass123")
    admin_headers = get_auth_headers(client, "admin@sizerec.example.com", "AdminPass123")

    # 1. Generate a recommendation for product 1 (Nordic Oxford Button-Down Shirt)
    rec_resp = client.post(
        "/api/v1/recommendations",
        headers=user_headers,
        json={"product_id": 1, "top_n": 3, "use_ml": True},
    )
    assert rec_resp.status_code == 201
    rec_data = rec_resp.json()
    rec_id = rec_data["recommendation_id"]
    assert rec_data["recommended_size"] in ("S", "M", "L")
    assert len(rec_data["ranked_sizes"]) == 3

    # 2. Submit fit feedback linked to the recommendation
    fb_resp = client.post(
        "/api/v1/feedback",
        headers=user_headers,
        json={
            "recommendation_id": rec_id,
            "actual_size_worn": rec_data["recommended_size"],
            "overall_fit": "perfect",
            "accepted_recommendation": True,
            "chest_bust_note": "2 cm ease, feels great",
            "comments": "Spot on recommendation!",
        },
    )
    assert fb_resp.status_code == 201
    fb_data = fb_resp.json()
    assert fb_data["fit_category_label"] == "good_fit"

    # 3. Check performance analytics
    analytics_resp = client.get("/api/v1/feedback/analytics", headers=user_headers)
    assert analytics_resp.status_code == 200
    analytics = analytics_resp.json()
    assert analytics["total_feedbacks"] >= 1
    assert analytics["overall_accuracy_rate"] == 1.0
    assert len(analytics["by_brand"]) >= 1

    # 4. Admin exports labelled training data CSV
    csv_resp = client.get("/api/v1/admin/feedback/export-csv", headers=admin_headers)
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    assert "NordicThread" in csv_resp.text


def test_admin_catalog_and_verification_endpoints(client: TestClient) -> None:
    """Verify admin can create brands, products, size charts, and mark them as verified."""
    admin_headers = get_auth_headers(client, "admin@sizerec.example.com", "AdminPass123")

    brand_resp = client.post(
        "/api/v1/admin/brands",
        headers=admin_headers,
        json={
            "name": "PeakForm Active",
            "slug": "peakform-active",
            "website_domain": "peakform.example.com",
            "country": "Canada",
            "sizing_system": "US",
        },
    )
    assert brand_resp.status_code == 201
    brand_id = brand_resp.json()["id"]

    chart_resp = client.post(
        "/api/v1/admin/size-charts",
        headers=admin_headers,
        json={
            "brand_id": brand_id,
            "category_id": 1,
            "name": "PeakForm Estimated Tops Chart",
            "data_source": "scraped_retail_table",
            "verification_status": "estimated",
            "measurements": [
                {"size_label": "M", "size_order": 1, "chest_bust_cm": 105.0, "shoulder_cm": 46.0}
            ],
        },
    )
    assert chart_resp.status_code == 201
    chart_id = chart_resp.json()["id"]
    assert chart_resp.json()["verification_status"] == "estimated"

    verify_resp = client.patch(
        f"/api/v1/admin/size-charts/{chart_id}/verify",
        headers=admin_headers,
        json={
            "verification_status": "verified",
            "data_source": "manual_audit_by_qa",
            "notes": "Verified with physical tape measure.",
        },
    )
    assert verify_resp.status_code == 200
    assert verify_resp.json()["verification_status"] == "verified"
    assert verify_resp.json()["verified_at"] is not None


def test_browser_extension_supported_and_unsupported_sites(client: TestClient) -> None:
    """Verify extension endpoints return recommendations for supported URLs and graceful JSON for unsupported sites."""
    user_headers = get_auth_headers(client, "alex@sizerec.example.com", "UserPass123")

    # 1. Supported URL lookup
    lookup_ok = client.post(
        "/api/v1/extension/lookup",
        json={"page_url": "https://nordicthread.example.com/products/oxford-shirt-101"},
    )
    assert lookup_ok.status_code == 200
    assert lookup_ok.json()["supported"] is True
    assert lookup_ok.json()["product_id"] == 1

    # 2. Supported URL recommendation
    rec_ok = client.post(
        "/api/v1/extension/recommend",
        headers=user_headers,
        json={"page_url": "https://nordicthread.example.com/products/oxford-shirt-101"},
    )
    assert rec_ok.status_code == 200
    rec_payload = rec_ok.json()
    assert rec_payload["supported"] is True
    assert rec_payload["recommendation"]["recommended_size"] in ("S", "M", "L")

    # 3. Unsupported website handled gracefully (never 500)
    unsupported_lookup = client.post(
        "/api/v1/extension/lookup",
        json={"page_url": "https://unknown-random-shop.example.org/item/999"},
    )
    assert unsupported_lookup.status_code == 200
    assert unsupported_lookup.json()["supported"] is False

    unsupported_rec = client.post(
        "/api/v1/extension/recommend",
        headers=user_headers,
        json={"page_url": "https://unknown-random-shop.example.org/item/999"},
    )
    assert unsupported_rec.status_code == 200
    assert unsupported_rec.json()["supported"] is False
    assert unsupported_rec.json()["recommendation"] is None
