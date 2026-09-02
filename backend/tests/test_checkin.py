from concurrent.futures import ThreadPoolExecutor

from tests.conftest import create_published_event_with_ticket, register_and_verify


def _issue_free_ticket(client, ctx, email):
    access, _ = register_and_verify(client, ctx["db"], email=email)
    resp = client.post(
        "/api/v1/registrations",
        json={"event_id": ctx["event"]["id"], "ticket_type_id": ctx["ticket_type"]["id"]},
        headers={"Authorization": f"Bearer {access}"},
    )
    return resp.json()["registration"]["ticket"], access


def test_valid_ticket_verifies_and_checks_in(client, db):
    ctx = create_published_event_with_ticket(client, db, price="0")
    ctx["db"] = db
    ticket, _ = _issue_free_ticket(client, ctx, "checkin1@example.com")

    org_headers = {"Authorization": f"Bearer {ctx['organizer_access']}"}
    event_id = ctx["event"]["id"]

    verify = client.post(f"/api/v1/events/{event_id}/checkins/verify", json={"token": ticket["secure_token"]}, headers=org_headers)
    assert verify.status_code == 200
    assert verify.json()["valid"] is True

    checkin = client.post(f"/api/v1/events/{event_id}/checkins", json={"token": ticket["secure_token"]}, headers=org_headers)
    assert checkin.status_code == 200
    assert checkin.json()["valid"] is True


def test_duplicate_checkin_denied(client, db):
    ctx = create_published_event_with_ticket(client, db, price="0")
    ctx["db"] = db
    ticket, _ = _issue_free_ticket(client, ctx, "checkin2@example.com")
    org_headers = {"Authorization": f"Bearer {ctx['organizer_access']}"}
    event_id = ctx["event"]["id"]
    body = {"token": ticket["secure_token"]}

    first = client.post(f"/api/v1/events/{event_id}/checkins", json=body, headers=org_headers)
    assert first.json()["valid"] is True

    second = client.post(f"/api/v1/events/{event_id}/checkins", json=body, headers=org_headers)
    assert second.json()["valid"] is False
    assert second.json()["already_checked_in"] is True


def test_wrong_event_ticket_denied(client, db):
    ctx1 = create_published_event_with_ticket(client, db, price="0", organizer_email="org1@example.com")
    ctx1["db"] = db
    ctx2 = create_published_event_with_ticket(client, db, price="0", organizer_email="org2@example.com")

    ticket, _ = _issue_free_ticket(client, ctx1, "wrongevent@example.com")

    org2_headers = {"Authorization": f"Bearer {ctx2['organizer_access']}"}
    resp = client.post(
        f"/api/v1/events/{ctx2['event']['id']}/checkins/verify",
        json={"token": ticket["secure_token"]},
        headers=org2_headers,
    )
    assert resp.status_code == 200
    assert resp.json()["valid"] is False
    assert "different event" in resp.json()["reason"]


def test_revoked_ticket_denied_at_checkin(client, db):
    ctx = create_published_event_with_ticket(client, db, price="0")
    ctx["db"] = db
    ticket, _ = _issue_free_ticket(client, ctx, "revoked@example.com")
    org_headers = {"Authorization": f"Bearer {ctx['organizer_access']}"}

    revoke = client.post(f"/api/v1/tickets/{ticket['id']}/revoke", json={"reason": "duplicate purchase"}, headers=org_headers)
    assert revoke.status_code == 200
    assert revoke.json()["status"] == "revoked"

    checkin = client.post(
        f"/api/v1/events/{ctx['event']['id']}/checkins", json={"token": ticket["secure_token"]}, headers=org_headers
    )
    assert checkin.json()["valid"] is False
    assert "revoked" in checkin.json()["reason"].lower()


def test_unauthorized_staff_cannot_checkin(client, db):
    ctx = create_published_event_with_ticket(client, db, price="0")
    ctx["db"] = db
    ticket, _ = _issue_free_ticket(client, ctx, "unauthstaff@example.com")

    random_access, _ = register_and_verify(client, db, email="randomperson@example.com")
    resp = client.post(
        f"/api/v1/events/{ctx['event']['id']}/checkins",
        json={"token": ticket["secure_token"]},
        headers={"Authorization": f"Bearer {random_access}"},
    )
    assert resp.status_code == 403


def test_concurrent_checkins_only_one_succeeds(raw_client, db):
    """Fires many simultaneous check-in requests at the same ticket, each
    getting its own real DB session (like independent HTTP requests would in
    production), and asserts exactly one wins -- the same compare-and-swap
    guarantee exercised manually against the live server earlier, now
    pinned as an automated regression test."""
    ctx = create_published_event_with_ticket(raw_client, db, price="0")
    ctx["db"] = db
    ticket, _ = _issue_free_ticket(raw_client, ctx, "race@example.com")
    org_headers = {"Authorization": f"Bearer {ctx['organizer_access']}"}
    event_id = ctx["event"]["id"]
    body = {"token": ticket["secure_token"]}

    def attempt(_):
        return raw_client.post(f"/api/v1/events/{event_id}/checkins", json=body, headers=org_headers).json()["valid"]

    with ThreadPoolExecutor(max_workers=8) as pool:
        results = list(pool.map(attempt, range(8)))

    assert results.count(True) == 1
