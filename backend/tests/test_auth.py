from tests.conftest import register_and_verify


def test_register_creates_unverified_user(client):
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Ada",
            "last_name": "Lovelace",
            "email": "ada@example.com",
            "phone": "+2348010000000",
            "password": "Passw0rd!1",
            "confirm_password": "Passw0rd!1",
        },
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["user"]["is_email_verified"] is False
    assert "access_token" in body


def test_register_duplicate_email_rejected(client):
    payload = {
        "first_name": "Ada", "last_name": "Lovelace", "email": "dup@example.com",
        "phone": "+2348010000000", "password": "Passw0rd!1", "confirm_password": "Passw0rd!1",
    }
    assert client.post("/api/v1/auth/register", json=payload).status_code == 201
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 409


def test_register_password_mismatch_rejected(client):
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Ada", "last_name": "Lovelace", "email": "mismatch@example.com",
            "phone": "+2348010000000", "password": "Passw0rd!1", "confirm_password": "Different1",
        },
    )
    assert resp.status_code == 422


def test_cannot_self_register_as_admin(client):
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Evil", "last_name": "Admin", "email": "evil@example.com",
            "phone": "+2348010000000", "password": "Passw0rd!1", "confirm_password": "Passw0rd!1",
            "role": "admin",
        },
    )
    assert resp.status_code == 422


def test_verify_email_with_bad_token_rejected(client):
    resp = client.post("/api/v1/auth/verify-email", json={"token": "not-a-real-token"})
    assert resp.status_code == 400


def test_login_wrong_password_rejected(client, db):
    register_and_verify(client, db, email="login1@example.com")
    resp = client.post("/api/v1/auth/login", json={"email": "login1@example.com", "password": "WrongPass1!"})
    assert resp.status_code == 401


def test_me_requires_authentication(client):
    resp = client.get("/api/v1/auth/me")
    assert resp.status_code == 401


def test_unverified_user_can_browse_but_not_act(client):
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Notyet", "last_name": "Verified", "email": "unverified@example.com",
            "phone": "+2348010000000", "password": "Passw0rd!1", "confirm_password": "Passw0rd!1",
        },
    )
    access = resp.json()["access_token"]

    # Browsing public events requires no auth at all and always works.
    assert client.get("/api/v1/events").status_code == 200

    # But acting (e.g. registering for an event) requires a verified email.
    reg_resp = client.post(
        "/api/v1/registrations",
        json={"event_id": "00000000-0000-0000-0000-000000000000", "ticket_type_id": "00000000-0000-0000-0000-000000000000"},
        headers={"Authorization": f"Bearer {access}"},
    )
    assert reg_resp.status_code == 403
