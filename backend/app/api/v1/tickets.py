import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_verified_user
from app.models.enums import UserRole
from app.models.ticket import Registration, Ticket
from app.models.user import User
from app.schemas.ticket import TicketOut
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
