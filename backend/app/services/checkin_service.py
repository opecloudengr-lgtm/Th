import uuid
from datetime import datetime, timezone

from sqlalchemy import update
from sqlalchemy.orm import Session, joinedload

from app.models.checkin import CheckIn
from app.models.enums import CheckInMethod, PaymentStatus, TicketStatus
from app.models.ticket import Registration, Ticket
from app.schemas.checkin import TicketVerificationView


def find_ticket(db: Session, *, token: str | None, ticket_code: str | None) -> Ticket | None:
    query = db.query(Ticket).options(
        joinedload(Ticket.registration).joinedload(Registration.event),
        joinedload(Ticket.registration).joinedload(Registration.ticket_type),
        joinedload(Ticket.registration).joinedload(Registration.payment),
        joinedload(Ticket.seat),
        joinedload(Ticket.checkin),
    )
    if token:
        return query.filter(Ticket.secure_token == token).first()
    if ticket_code:
        return query.filter(Ticket.ticket_code == ticket_code.strip().upper()).first()
    return None


def build_verification_view(ticket: Ticket | None, event_id: uuid.UUID) -> TicketVerificationView:
    if ticket is None:
        return TicketVerificationView(valid=False, reason="Ticket not found. This QR code is not recognized.")

    registration = ticket.registration
    event = registration.event

    if event.id != event_id:
        return TicketVerificationView(
            valid=False,
            reason=f"This ticket is for a different event ({event.title}).",
            ticket_id=ticket.id,
            ticket_code=ticket.ticket_code,
            status=ticket.status,
            event_title=event.title,
        )

    payment_status = registration.payment.status if registration.payment else None
    is_free = registration.payment is None

    base_kwargs = dict(
        ticket_id=ticket.id,
        ticket_code=ticket.ticket_code,
        status=ticket.status,
        attendee_name=registration.full_name,
        ticket_type_name=registration.ticket_type.name,
        vip_level=ticket.vip_level,
        vip_label=ticket.vip_display,
        seat_label=ticket.seat.label if ticket.seat else None,
        payment_status=payment_status,
        is_free_ticket=is_free,
        event_title=event.title,
    )

    if ticket.status == TicketStatus.USED:
        checkin = ticket.checkin
        return TicketVerificationView(
            valid=False,
            reason="This ticket has already been used to check in.",
            already_checked_in=True,
            checked_in_at=checkin.checked_in_at if checkin else None,
            **base_kwargs,
        )

    if ticket.status == TicketStatus.REVOKED:
        return TicketVerificationView(valid=False, reason="This ticket has been revoked.", **base_kwargs)

    if ticket.status == TicketStatus.EXPIRED:
        return TicketVerificationView(valid=False, reason="This ticket has expired.", **base_kwargs)

    if ticket.status == TicketStatus.CANCELLED:
        return TicketVerificationView(valid=False, reason="This ticket was cancelled.", **base_kwargs)

    if ticket.status == TicketStatus.PENDING:
        return TicketVerificationView(valid=False, reason="Payment for this ticket has not been confirmed yet.", **base_kwargs)

    if payment_status is not None and payment_status != PaymentStatus.SUCCESS:
        return TicketVerificationView(valid=False, reason="Payment for this ticket was not successful.", **base_kwargs)

    return TicketVerificationView(valid=True, reason=None, **base_kwargs)


class CheckInConflict(Exception):
    pass


def perform_atomic_checkin(
    db: Session, ticket: Ticket, staff_user_id: uuid.UUID | None, method: CheckInMethod, device_info: str | None
) -> CheckIn:
    """Compare-and-swap the ticket status inside the DB so two simultaneous
    scans of the same ticket can never both succeed. Postgres serializes
    concurrent UPDATEs on the same row; the loser's WHERE clause simply
    matches zero rows once the winner commits."""
    result = db.execute(
        update(Ticket)
        .where(Ticket.id == ticket.id, Ticket.status == TicketStatus.ACTIVE)
        .values(status=TicketStatus.USED, used_at=datetime.now(timezone.utc))
    )
    if result.rowcount == 0:
        raise CheckInConflict("This ticket is no longer valid for check-in (already used, revoked, or not active).")

    checkin = CheckIn(
        ticket_id=ticket.id,
        event_id=ticket.registration.event_id,
        staff_user_id=staff_user_id,
        method=method,
        device_info=device_info,
    )
    db.add(checkin)
    try:
        db.flush()
    except Exception as exc:
        db.rollback()
        raise CheckInConflict("This ticket was already checked in.") from exc

    return checkin
