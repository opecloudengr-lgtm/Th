import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user, get_current_user_optional
from app.core.security import generate_secure_token
from app.models.enums import (
    EventStatus,
    InvitationStatus,
    NotificationType,
    RegistrationStatus,
    UserRole,
)
from app.models.event import Event, TicketType
from app.models.invitation import Invitation
from app.models.ticket import Registration
from app.models.user import User
from app.schemas.invitation import GuestInvitationView, InvitationCreate, InvitationOut
from app.schemas.ticket import RegistrationOut
from app.services.audit_service import log_action
from app.services.email_service import send_invitation_email, send_ticket_email
from app.services.ticket_service import issue_ticket

router = APIRouter(tags=["invitations"])


def _get_owned_event(db: Session, event_id: uuid.UUID, user: User) -> Event:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Event not found.")
    if event.organizer_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not own this event.")
    return event


def _default_ticket_type(db: Session, event: Event, requested_id: uuid.UUID | None) -> TicketType:
    if requested_id:
        tt = db.get(TicketType, requested_id)
        if not tt or tt.event_id != event.id:
            raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Ticket type not found for this event.")
        return tt
    tt = (
        db.query(TicketType)
        .filter(TicketType.event_id == event.id, TicketType.is_active.is_(True))
        .order_by(TicketType.price.asc())
        .first()
    )
    if not tt:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail="Create at least one ticket type for this event before inviting guests."
        )
    return tt


@router.post("/events/{event_id}/invitations", response_model=InvitationOut, status_code=status.HTTP_201_CREATED)
def create_invitation(
    event_id: uuid.UUID,
    payload: InvitationCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    event = _get_owned_event(db, event_id, user)
    tt = _default_ticket_type(db, event, payload.ticket_type_id)

    invitation = Invitation(
        event_id=event.id,
        invited_by_id=user.id,
        ticket_type_id=tt.id,
        guest_name=payload.guest_name,
        guest_email=str(payload.guest_email).lower(),
        guest_phone=payload.guest_phone,
        vip_level=payload.vip_level,
        custom_vip_label=payload.custom_vip_label,
        seat_id=payload.seat_id,
        guest_token=generate_secure_token(24),
    )
    db.add(invitation)
    db.commit()
    db.refresh(invitation)
    return invitation


@router.post("/events/{event_id}/invitations/bulk", response_model=list[InvitationOut], status_code=status.HTTP_201_CREATED)
def bulk_create_invitations(
    event_id: uuid.UUID,
    payload: list[InvitationCreate],
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    event = _get_owned_event(db, event_id, user)
    created: list[Invitation] = []
    for item in payload:
        tt = _default_ticket_type(db, event, item.ticket_type_id)
        invitation = Invitation(
            event_id=event.id,
            invited_by_id=user.id,
            ticket_type_id=tt.id,
            guest_name=item.guest_name,
            guest_email=str(item.guest_email).lower(),
            guest_phone=item.guest_phone,
            vip_level=item.vip_level,
            custom_vip_label=item.custom_vip_label,
            seat_id=item.seat_id,
            guest_token=generate_secure_token(24),
        )
        db.add(invitation)
        created.append(invitation)
    db.commit()
    for i in created:
        db.refresh(i)
    return created


@router.get("/events/{event_id}/invitations", response_model=list[InvitationOut])
def list_invitations(
    event_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    _get_owned_event(db, event_id, user)
    return (
        db.query(Invitation)
        .filter(Invitation.event_id == event_id)
        .order_by(Invitation.created_at.desc())
        .all()
    )


@router.post("/invitations/{invitation_id}/send", response_model=InvitationOut)
def send_invitation(
    invitation_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    invitation = db.get(Invitation, invitation_id)
    if not invitation:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Invitation not found.")
    event = _get_owned_event(db, invitation.event_id, user)

    invite_url = f"{settings.FRONTEND_URL}/invite/{invitation.guest_token}"
    send_invitation_email(invitation.guest_email, invitation.guest_name, event.title, invite_url)
    invitation.status = InvitationStatus.SENT
    log_action(db, actor_id=user.id, action="invitation.send", resource_type="invitation", resource_id=str(invitation.id))
    db.commit()
    db.refresh(invitation)
    return invitation


@router.delete("/invitations/{invitation_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_invitation(
    invitation_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    invitation = db.get(Invitation, invitation_id)
    if not invitation:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Invitation not found.")
    _get_owned_event(db, invitation.event_id, user)
    if invitation.status == InvitationStatus.ACCEPTED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This invitation has already been accepted.")
    db.delete(invitation)
    db.commit()
    return None


# ---------- Guest-facing (no account required) ----------


@router.get("/invite/{token}", response_model=GuestInvitationView)
def view_invitation(token: str, db: Annotated[Session, Depends(get_db)]):
    invitation = (
        db.query(Invitation).options(joinedload(Invitation.event)).filter(Invitation.guest_token == token).first()
    )
    if not invitation:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Invitation not found.")
    event = invitation.event
    return GuestInvitationView(
        guest_name=invitation.guest_name,
        vip_level=invitation.vip_level,
        custom_vip_label=invitation.custom_vip_label,
        status=invitation.status,
        event_title=event.title,
        event_start_at=event.start_at,
        event_venue=event.venue_name or event.online_url,
        event_cover_image_url=event.cover_image_url,
        theme_color=event.theme_color,
        already_registered=invitation.status == InvitationStatus.ACCEPTED,
    )


@router.post("/invite/{token}/accept", response_model=RegistrationOut)
def accept_invitation(
    token: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)],
):
    invitation = (
        db.query(Invitation).options(joinedload(Invitation.event)).filter(Invitation.guest_token == token).first()
    )
    if not invitation:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Invitation not found.")
    if invitation.event.status != EventStatus.PUBLISHED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This event is not currently open.")

    existing_reg = db.query(Registration).filter(Registration.invitation_id == invitation.id).first()
    if existing_reg:
        return existing_reg

    tt = db.get(TicketType, invitation.ticket_type_id)

    # If the guest happens to be logged in with a matching verified email, link
    # the ticket to their account so it shows up in their dashboard too.
    linked_user = user if (user and user.email.lower() == invitation.guest_email.lower()) else None

    registration = Registration(
        event_id=invitation.event_id,
        user_id=linked_user.id if linked_user else None,
        ticket_type_id=tt.id,
        invitation_id=invitation.id,
        full_name=invitation.guest_name,
        email=invitation.guest_email,
        phone=invitation.guest_phone,
        status=RegistrationStatus.CONFIRMED,
        is_guest_invite=True,
    )
    db.add(registration)
    db.flush()

    ticket = issue_ticket(db, registration)
    ticket.vip_level = invitation.vip_level
    ticket.custom_vip_label = invitation.custom_vip_label
    if invitation.seat_id:
        from app.models.enums import SeatStatus
        from app.models.seat import Seat

        seat = db.get(Seat, invitation.seat_id)
        if seat and seat.status != SeatStatus.ASSIGNED:
            ticket.seat_id = seat.id
            seat.status = SeatStatus.ASSIGNED

    invitation.status = InvitationStatus.ACCEPTED

    if linked_user:
        from app.services import notification_service

        notification_service.notify(
            db,
            user=linked_user,
            type_=NotificationType.TICKET_ISSUED,
            title=f"You're confirmed for {invitation.event.title}",
            message="Your personalized ticket is ready.",
            related_event_id=invitation.event_id,
        )

    db.commit()
    db.refresh(registration)

    ticket_url = f"{settings.FRONTEND_URL}/invite/{token}/ticket"
    send_ticket_email(invitation.guest_email, invitation.guest_name, invitation.event.title, ticket_url)

    return registration


def _get_accepted_registration_for_token(db: Session, token: str) -> Registration:
    invitation = db.query(Invitation).filter(Invitation.guest_token == token).first()
    if not invitation or invitation.status != InvitationStatus.ACCEPTED:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="No accepted ticket for this invitation yet.")
    registration = (
        db.query(Registration)
        .options(joinedload(Registration.event), joinedload(Registration.ticket_type), joinedload(Registration.ticket))
        .filter(Registration.invitation_id == invitation.id)
        .first()
    )
    if not registration:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Ticket not found.")
    return registration


@router.get("/invite/{token}/ticket", response_model=RegistrationOut)
def get_guest_ticket(token: str, db: Annotated[Session, Depends(get_db)]):
    return _get_accepted_registration_for_token(db, token)


@router.get("/invite/{token}/ticket/qr.png")
def get_guest_ticket_qr(token: str, db: Annotated[Session, Depends(get_db)]):
    from app.services.qr_service import generate_qr_png

    registration = _get_accepted_registration_for_token(db, token)
    png = generate_qr_png(registration.ticket.secure_token)
    return Response(content=png, media_type="image/png")


@router.get("/invite/{token}/ticket/pdf")
def get_guest_ticket_pdf(token: str, db: Annotated[Session, Depends(get_db)]):
    from app.services.pdf_service import generate_ticket_pdf

    registration = _get_accepted_registration_for_token(db, token)
    pdf_bytes = generate_ticket_pdf(registration.ticket)
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{registration.ticket.ticket_code}.pdf"'},
    )
