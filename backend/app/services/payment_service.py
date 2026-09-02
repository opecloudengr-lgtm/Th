from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.models.enums import NotificationType, PaymentStatus, RegistrationStatus
from app.models.payment import Payment
from app.models.ticket import Registration, Ticket
from app.services import notification_service
from app.services.audit_service import log_action
from app.services.email_service import send_ticket_email
from app.services.paystack_service import to_subunit
from app.services.ticket_service import issue_ticket


def confirm_payment_success(db: Session, payment: Payment, paystack_data: dict) -> Ticket | None:
    """Apply a verified Paystack success to a payment + registration and
    issue the ticket. Idempotent -- safe to call from both the client
    verify endpoint and the webhook for the same reference; only the
    first caller does any work."""
    if payment.status == PaymentStatus.SUCCESS:
        return payment.registration.ticket

    expected_subunit = to_subunit(payment.amount)
    if paystack_data.get("amount") != expected_subunit:
        raise ValueError(
            f"Amount mismatch for reference {payment.paystack_reference}: "
            f"expected {expected_subunit}, got {paystack_data.get('amount')}"
        )

    registration: Registration = (
        db.query(Registration)
        .options(joinedload(Registration.ticket_type), joinedload(Registration.user), joinedload(Registration.event))
        .filter(Registration.id == payment.registration_id)
        .one()
    )

    payment.status = PaymentStatus.SUCCESS
    payment.paid_at = datetime.now(timezone.utc)
    payment.raw_response = paystack_data
    payment.webhook_verified = True
    registration.status = RegistrationStatus.CONFIRMED

    ticket = issue_ticket(db, registration)

    log_action(
        db,
        actor_id=registration.user_id,
        action="payment.success",
        resource_type="payment",
        resource_id=str(payment.id),
        metadata={"reference": payment.paystack_reference},
    )

    if registration.user:
        notification_service.notify(
            db,
            user=registration.user,
            type_=NotificationType.PAYMENT_SUCCESS,
            title=f"Payment confirmed for {registration.event.title}",
            message=f"We received your payment of {payment.currency} {payment.amount}. Your ticket is ready.",
            related_event_id=registration.event_id,
        )
        ticket_url = f"{settings.FRONTEND_URL}/dashboard/tickets/{ticket.id}"
        send_ticket_email(registration.user.email, registration.user.first_name, registration.event.title, ticket_url)

    return ticket


def mark_payment_failed(db: Session, payment: Payment, paystack_data: dict) -> None:
    if payment.status == PaymentStatus.SUCCESS:
        return
    payment.status = PaymentStatus.FAILED
    payment.raw_response = paystack_data
