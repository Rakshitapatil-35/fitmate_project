"""Tests for user registration, login, JWT validation, logout blacklisting, roles, and rate limiting."""

from fastapi.testclient import TestClient


def test_register_login_profile_and_logout_flow(client: TestClient) -> None:
    """Test complete user registration, login, profile update, and token revocation on logout."""
    reg_resp = client.post(
        "/api/v1/auth/register",
        json={
            "email": "newuser@sizerec.example.com",
            "full_name": "Jordan Taylor",
            "password": "StrongPassword99",
        },
    )
    assert reg_resp.status_code == 201
    assert reg_resp.json()["email"] == "newuser@sizerec.example.com"

    login_resp = client.post(
        "/api/v1/auth/login",
        json={"email": "newuser@sizerec.example.com", "password": "StrongPassword99"},
    )
    assert login_resp.status_code == 200
    tokens = login_resp.json()
    access_token = tokens["access_token"]
    refresh_token = tokens["refresh_token"]
    headers = {"Authorization": f"Bearer {access_token}"}

    # Access protected profile endpoint
    me_resp = client.get("/api/v1/users/me", headers=headers)
    assert me_resp.status_code == 200
    assert me_resp.json()["full_name"] == "Jordan Taylor"

    # Update profile
    upd_resp = client.put(
        "/api/v1/users/me",
        headers=headers,
        json={"full_name": "Jordan T. Updated"},
    )
    assert upd_resp.status_code == 200
    assert upd_resp.json()["full_name"] == "Jordan T. Updated"

    # Standard user cannot access admin endpoints
    admin_resp = client.get("/api/v1/admin/prediction-logs", headers=headers)
    assert admin_resp.status_code == 403

    # Logout revokes the token
    logout_resp = client.post(
        "/api/v1/auth/logout",
        headers=headers,
        json={"refresh_token": refresh_token},
    )
    assert logout_resp.status_code == 200

    # Subsequent calls with the blacklisted access token must return 401
    after_logout = client.get("/api/v1/users/me", headers=headers)
    assert after_logout.status_code == 401
