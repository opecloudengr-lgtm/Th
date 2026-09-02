from decimal import Decimal

import app.api.v1.registrations as registrations_module
import app.api.v1.payments as payments_module
from app.services.paystack_service import to_subunit
from tests.conftest import create_published_event_with_ticket, register_and_verify


def _fake_initialize(*, email, amount, reference, currency, callback_url, metadata):
    return {
        "authorization_url": f"https://paystack.test/pay/{reference}",
        "access_code": "fake_access_code",
        "reference": reference,
    }


def _fake_verify_success_factory(amount: Decimal):
    def _fake_verify(reference: str):
        return {"status": "success", "reference": reference, "amount": to_subunit(amount), "currency": "NGN"}

    return _fake_verify


def test_paid_registration_then_verify_issues_ticket(client, db, monkeypatch):
    ctx = create_published_event_with_ticket(client, db, price="25000")
    access, _ = register_and_verify(client, db, email="payer1@example.com")

    monkeypatch.setattr(registrations_module, "initialize_transaction", _fake_initialize)

    resp = client.post(
        "/api/v1/registrations",
        json={"event_id": ctx["event"]["id"], "ticket_type_id": ctx["ticket_type"]["id"]},
        headers={"Authorization": f"Bearer {access}"},
    )
    assert resp.status_code == 201, resp.text
    body = resp.json()
    assert body["requires_payment"] is True
    reference = body["registration"]["payment"]["paystack_reference"]
    assert body["registration"]["ticket"] is None

    monkeypatch.setattr(payments_module, "verify_transaction", _fake_verify_success_factory(Decimal("25000")))

    verify_resp = client.post(f"/api/v1/payments/verify/{reference}", headers={"Authorization": f"Bearer {access}"})
    assert verify_resp.status_code == 200
    assert verify_resp.json()["status"] == "success"

    reg_resp = client.get(f"/api/v1/registrations/mine", headers={"Authorization": f"Bearer {access}"})
    reg = reg_resp.json()[0]
    assert reg["status"] == "confirmed"
    assert reg["ticket"]["status"] == "active"


def test_duplicate_webhook_does_not_double_issue_ticket(client, db, monkeypatch):
    ctx = create_published_event_with_ticket(client, db, price="10000")
    access, _ = register_and_verify(client, db, email="payer2@example.com")
    monkeypatch.setattr(registrations_module, "initialize_transaction", _fake_initialize)

    resp = client.post(
        "/api/v1/registrations",
        json={"event_id": ctx["event"]["id"], "ticket_type_id": ctx["ticket_type"]["id"]},
        headers={"Authorization": f"Bearer {access}"},
    )
    reference = resp.json()["registration"]["payment"]["paystack_reference"]

    monkeypatch.setattr(payments_module, "verify_transaction", _fake_verify_success_factory(Decimal("10000")))
    headers = {"Authorization": f"Bearer {access}"}

    first = client.post(f"/api/v1/payments/verify/{reference}", headers=headers)
    ticket_id_1 = None
    reg = client.get("/api/v1/registrations/mine", headers=headers).json()[0]
    ticket_id_1 = reg["ticket"]["id"]

    # Simulate the webhook firing again for the same, already-confirmed reference.
    second = client.post(f"/api/v1/payments/verify/{reference}", headers=headers)
    assert second.status_code == 200

    reg_after = client.get("/api/v1/registrations/mine", headers=headers).json()[0]
    assert reg_after["ticket"]["id"] == ticket_id_1  # same ticket, not a new one

    from app.models.ticket import Ticket

    count = db.query(Ticket).filter(Ticket.registration_id == reg_after["id"]).count()
    assert count == 1


def test_payment_amount_mismatch_rejected(client, db, monkeypatch):
    ctx = create_published_event_with_ticket(client, db, price="10000")
    access, _ = register_and_verify(client, db, email="payer3@example.com")
    monkeypatch.setattr(registrations_module, "initialize_transaction", _fake_initialize)

    resp = client.post(
        "/api/v1/registrations",
        json={"event_id": ctx["event"]["id"], "ticket_type_id": ctx["ticket_type"]["id"]},
        headers={"Authorization": f"Bearer {access}"},
    )
    reference = resp.json()["registration"]["payment"]["paystack_reference"]

    # Attacker-controlled amount, way lower than what's actually owed.
    monkeypatch.setattr(payments_module, "verify_transaction", _fake_verify_success_factory(Decimal("1")))

    verify_resp = client.post(
        f"/api/v1/payments/verify/{reference}", headers={"Authorization": f"Bearer {access}"}
    )
    assert verify_resp.status_code == 400

    reg = client.get("/api/v1/registrations/mine", headers={"Authorization": f"Bearer {access}"}).json()[0]
    assert reg["ticket"] is None
    assert reg["status"] == "pending"
