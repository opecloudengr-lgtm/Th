from tests.conftest import create_published_event_with_ticket, register_and_verify


def test_free_registration_issues_active_ticket_immediately(client, db):
    ctx = create_published_event_with_ticket(client, db, price="0")
    access, _ = register_and_verify(client, db, email="attendee1@example.com")

    resp = client.post(
        "/api/v1/registrations",
        json={"event_id": ctx["event"]["id"], "ticket_type_id": ctx["ticket_type"]["id"]},
        headers={"Authorization": f"Bearer {access}"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["requires_payment"] is False
    assert body["registration"]["ticket"]["status"] == "active"
    assert len(body["registration"]["ticket"]["secure_token"]) > 20


def test_cannot_register_twice_for_same_event(client, db):
    ctx = create_published_event_with_ticket(client, db, price="0")
    access, _ = register_and_verify(client, db, email="attendee2@example.com")

    body = {"event_id": ctx["event"]["id"], "ticket_type_id": ctx["ticket_type"]["id"]}
    headers = {"Authorization": f"Bearer {access}"}
    assert client.post("/api/v1/registrations", json=body, headers=headers).status_code == 201
    resp = client.post("/api/v1/registrations", json=body, headers=headers)
    assert resp.status_code == 409


def test_cannot_register_for_private_event_directly(client, db):
    ctx = create_published_event_with_ticket(client, db, price="0", registration_mode="private")
    access, _ = register_and_verify(client, db, email="attendee3@example.com")

    resp = client.post(
        "/api/v1/registrations",
        json={"event_id": ctx["event"]["id"], "ticket_type_id": ctx["ticket_type"]["id"]},
        headers={"Authorization": f"Bearer {access}"},
    )
    assert resp.status_code == 403


def test_sold_out_ticket_type_rejected(client, db):
    ctx = create_published_event_with_ticket(client, db, price="0")
    # Shrink capacity to 0 sold-out via API by patching directly is not exposed;
    # instead simulate by setting quantity_sold == capacity in DB.
    from app.models.event import TicketType

    tt = db.query(TicketType).filter(TicketType.id == ctx["ticket_type"]["id"]).first()
    tt.quantity_sold = tt.capacity
    db.commit()

    access, _ = register_and_verify(client, db, email="attendee4@example.com")
    resp = client.post(
        "/api/v1/registrations",
        json={"event_id": ctx["event"]["id"], "ticket_type_id": ctx["ticket_type"]["id"]},
        headers={"Authorization": f"Bearer {access}"},
    )
    assert resp.status_code == 409


def test_idor_cannot_view_another_users_ticket(client, db):
    ctx = create_published_event_with_ticket(client, db, price="0")
    owner_access, _ = register_and_verify(client, db, email="owner@example.com")
    attacker_access, _ = register_and_verify(client, db, email="attacker@example.com")

    reg_resp = client.post(
        "/api/v1/registrations",
        json={"event_id": ctx["event"]["id"], "ticket_type_id": ctx["ticket_type"]["id"]},
        headers={"Authorization": f"Bearer {owner_access}"},
    )
    ticket_id = reg_resp.json()["registration"]["ticket"]["id"]

    ok = client.get(f"/api/v1/tickets/{ticket_id}", headers={"Authorization": f"Bearer {owner_access}"})
    assert ok.status_code == 200

    blocked = client.get(f"/api/v1/tickets/{ticket_id}", headers={"Authorization": f"Bearer {attacker_access}"})
    assert blocked.status_code == 403


def test_ticket_qr_and_pdf_download(client, db):
    ctx = create_published_event_with_ticket(client, db, price="0")
    access, _ = register_and_verify(client, db, email="qrpdf@example.com")
    reg_resp = client.post(
        "/api/v1/registrations",
        json={"event_id": ctx["event"]["id"], "ticket_type_id": ctx["ticket_type"]["id"]},
        headers={"Authorization": f"Bearer {access}"},
    )
    ticket_id = reg_resp.json()["registration"]["ticket"]["id"]
    headers = {"Authorization": f"Bearer {access}"}

    qr = client.get(f"/api/v1/tickets/{ticket_id}/qr.png", headers=headers)
    assert qr.status_code == 200
    assert qr.headers["content-type"] == "image/png"

    pdf = client.get(f"/api/v1/tickets/{ticket_id}/pdf", headers=headers)
    assert pdf.status_code == 200
    assert pdf.headers["content-type"] == "application/pdf"
