import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from pydantic import BaseModel, Field

from app.core.database import get_db
from app.core.deps import get_verified_user
from app.models.enums import NotificationType, TicketStatus, UserRole, VipLevel
from app.models.seat import Seat
from app.models.ticket import Registration, Ticket
from app.models.user import User
from app.schemas.ticket import TicketOut
from app.services import notification_service
from app.services.audit_service import log_action
from app.services.pdf_service import generate_ticket_pdf
from app.services.qr_service import generate_qr_png

router = APIRouter(prefix="/tickets", tags=["tickets"])


def _load_ticket(db: Session, ticket_id: uuid.UUID) -> Ticket:
    ticket = (
        db.query(Ticket)
        .options(
            joinedload(Ticket.registration).joinedload(Registration.event),
            joinedload(Ticket.registration).joinedload(Registration.ticket_type),
            joinedload(Ticket.seat),
        )
        .filter(Ticket.id == ticket_id)
        .first()
    )
    if not ticket:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Ticket not found.")
    return ticket


def _authorize_owner(ticket: Ticket, user: User) -> None:
    is_owner = ticket.registration.user_id == user.id
    is_organizer = ticket.registration.event.organizer_id == user.id
    if not (is_owner or is_organizer or user.role == UserRole.ADMIN):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You cannot access this ticket.")


def _authorize_organizer(ticket: Ticket, user: User) -> None:
    is_organizer = ticket.registration.event.organizer_id == user.id
    if not (is_organizer or user.role == UserRole.ADMIN):
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Only the event organizer can do this.")


@router.get("/{ticket_id}", response_model=TicketOut)
def get_ticket(
    ticket_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_verified_user)],
):
    ticket = _load_ticket(db, ticket_id)
    _authorize_owner(ticket, user)
    return ticket


@router.get("/{ticket_id}/qr.png")
def get_ticket_qr(
    ticket_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_verified_user)],
):
    ticket = _load_ticket(db, ticket_id)
    _authorize_owner(ticket, user)
    png = generate_qr_png(ticket.secure_token)
    return Response(content=png, media_type="image/png")


@router.get("/{ticket_id}/pdf")
def get_ticket_pdf(
    ticket_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_verified_user)],
):
    ticket = _load_ticket(db, ticket_id)
    _authorize_owner(ticket, user)
    pdf_bytes = generate_ticket_pdf(ticket)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{ticket.ticket_code}.pdf"'},
    )


class TicketVipUpdate(BaseModel):
    vip_level: VipLevel
    custom_vip_label: str | None = None


@router.patch("/{ticket_id}/vip", response_model=TicketOut)
def update_ticket_vip(
    ticket_id: uuid.UUID,
    payload: TicketVipUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_verified_user)],
):
    ticket = _load_ticket(db, ticket_id)
    _authorize_organizer(ticket, user)
    ticket.vip_level = payload.vip_level
    ticket.custom_vip_label = payload.custom_vip_label
    log_action(db, actor_id=user.id, action="ticket.set_vip", resource_type="ticket", resource_id=str(ticket.id))
    db.commit()
    db.refresh(ticket)
    return ticket


class TicketRevokeRequest(BaseModel):
    reason: str = Field(min_length=1, max_length=255)


@router.post("/{ticket_id}/revoke", response_model=TicketOut)
def revoke_ticket(
    ticket_id: uuid.UUID,
    payload: TicketRevokeRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_verified_user)],
):
    ticket = _load_ticket(db, ticket_id)
    _authorize_organizer(ticket, user)
    if ticket.status == TicketStatus.USED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This ticket has already been used and cannot be revoked.")

    ticket.status = TicketStatus.REVOKED
    ticket.revoked_reason = payload.reason
    if ticket.seat_id:
        seat = db.get(Seat, ticket.seat_id)
        if seat:
            from app.models.enums import SeatStatus

            seat.status = SeatStatus.AVAILABLE
        ticket.seat_id = None

    log_action(
        db, actor_id=user.id, action="ticket.revoke", resource_type="ticket", resource_id=str(ticket.id),
        metadata={"reason": payload.reason},
    )

    registration = ticket.registration
    if registration.user:
        notification_service.notify(
            db,
            user=registration.user,
            type_=NotificationType.TICKET_REVOKED,
            title=f"Your ticket for {registration.event.title} was revoked",
            message=payload.reason,
            related_event_id=registration.event_id,
            also_email=True,
        )

    db.commit()
    db.refresh(ticket)
    return ticket
