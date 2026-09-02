import secrets
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from app.core.security import generate_secure_token
from app.models.enums import TicketStatus, VipLevel
from app.models.ticket import Registration, Ticket


def _generate_ticket_code(db: Session) -> str:
    while True:
        code = "EVT-" + "".join(secrets.choice("ABCDEFGHJKLMNPQRSTUVWXYZ23456789") for _ in range(8))
        if not db.query(Ticket).filter(Ticket.ticket_code == code).first():
            return code


def issue_ticket(db: Session, registration: Registration) -> Ticket:
    """Issue exactly one unique, cryptographically secure ticket for a
    confirmed registration. Idempotent: calling this twice for the same
    registration returns the existing ticket rather than creating a
    duplicate (prevents double-issuance on webhook + callback races)."""
    if registration.ticket is not None:
        return registration.ticket

    vip_level = VipLevel.VIP if registration.ticket_type.is_vip else VipLevel.REGULAR

    ticket = Ticket(
        registration_id=registration.id,
        ticket_code=_generate_ticket_code(db),
        secure_token=generate_secure_token(32),
        vip_level=vip_level,
        status=TicketStatus.ACTIVE,
        issued_at=datetime.now(timezone.utc),
    )
    db.add(ticket)
    registration.ticket_type.quantity_sold += 1
    db.flush()
    return ticket
