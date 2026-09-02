import uuid
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_verified_user
from app.core.rate_limit import rate_limit
from app.models.enums import (
    EventStatus,
    NotificationType,
    PaymentStatus,
    RegistrationStatus,
    RegistrationMode as RegModeEnum,
)
from app.models.event import Event, TicketType
from app.models.payment import Payment
from app.models.ticket import Registration
from app.models.user import User
from app.schemas.ticket import RegisterForEventRequest, RegistrationOut, RegistrationResult
from app.services import notification_service
from app.services.audit_service import log_action
from app.services.email_service import send_ticket_email
from app.services.paystack_service import PaystackError, initialize_transaction
from app.services.ticket_service import issue_ticket

router = APIRouter(prefix="/registrations", tags=["registrations"])


def _load_full(db: Session, registration_id: uuid.UUID) -> Registration:
    return (
        db.query(Registration)
        .options(
            joinedload(Registration.event),
            joinedload(Registration.ticket_type),
            joinedload(Registration.payment),
            joinedload(Registration.ticket),
        )
        .filter(Registration.id == registration_id)
        .one()
    )


@router.post("", response_model=RegistrationResult, status_code=status.HTTP_201_CREATED)
def register_for_event(
    body: RegisterForEventRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_verified_user)],
    _rl: Annotated[None, Depends(rate_limit("register_event", 20, 3600))],
):
    event = db.get(Event, body.event_id)
    if not event or event.status != EventStatus.PUBLISHED:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Event not found or not open for registration.")

    if event.registration_mode == RegModeEnum.PRIVATE:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="This is a private event. You need a personal invitation link to register.",
        )

    ticket_type = db.get(TicketType, body.ticket_type_id)
    if not ticket_type or ticket_type.event_id != event.id or not ticket_type.is_active:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Ticket type not found.")

    now = datetime.now(timezone.utc)
    if ticket_type.sales_start and now < ticket_type.sales_start:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Ticket sales have not started yet.")
    if ticket_type.sales_end and now > ticket_type.sales_end:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Ticket sales have closed.")
    if ticket_type.capacity is not None and ticket_type.quantity_sold >= ticket_type.capacity:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="This ticket type is sold out.")

    existing = (
        db.query(Registration)
        .filter(
            Registration.event_id == event.id,
            Registration.user_id == user.id,
            Registration.status != RegistrationStatus.CANCELLED,
        )
        .first()
    )
    if existing:
        raise HTTPException(
            status.HTTP_409_CONFLICT, detail="You already have a registration for this event. Check My Tickets."
        )

    registration = Registration(
        event_id=event.id,
        user_id=user.id,
        ticket_type_id=ticket_type.id,
        full_name=body.full_name or user.full_name,
        email=str(body.email or user.email),
        phone=body.phone or user.phone,
        status=RegistrationStatus.PENDING,
    )
    db.add(registration)
    db.flush()

    is_free = ticket_type.price == 0

    if is_free:
        registration.status = RegistrationStatus.CONFIRMED
        ticket = issue_ticket(db, registration)
        log_action(
            db, actor_id=user.id, action="registration.confirm_free", resource_type="registration",
            resource_id=str(registration.id),
        )
        notification_service.notify(
            db,
            user=user,
            type_=NotificationType.TICKET_ISSUED,
            title=f"You're registered for {event.title}",
            message="Your free ticket is ready. View it in My Tickets.",
            related_event_id=event.id,
        )
        db.commit()
        ticket_url = f"{settings.FRONTEND_URL}/dashboard/tickets/{ticket.id}"
        send_ticket_email(user.email, user.first_name, event.title, ticket_url)
        db.refresh(registration)
        return RegistrationResult(registration=_load_full(db, registration.id), requires_payment=False)

    reference = f"EVTPASS-{uuid.uuid4().hex[:24]}"
    payment = Payment(
        registration_id=registration.id,
        amount=ticket_type.price,
        currency=event.currency,
        paystack_reference=reference,
        status=PaymentStatus.PENDING,
    )
    db.add(payment)
    db.flush()

    try:
        result = initialize_transaction(
            email=str(body.email or user.email),
            amount=ticket_type.price,
            reference=reference,
            currency=event.currency,
            callback_url=f"{settings.FRONTEND_URL}/payment/callback",
            metadata={"registration_id": str(registration.id), "event_id": str(event.id)},
        )
    except PaystackError as exc:
        db.rollback()
        raise HTTPException(exc.status_code if exc.status_code != 502 else status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    payment.paystack_access_code = result.get("access_code")
    payment.paystack_authorization_url = result.get("authorization_url")
    log_action(
        db, actor_id=user.id, action="registration.pending_payment", resource_type="registration",
        resource_id=str(registration.id),
    )
    db.commit()

    return RegistrationResult(
        registration=_load_full(db, registration.id),
        requires_payment=True,
        payment_authorization_url=payment.paystack_authorization_url,
    )


@router.get("/mine", response_model=list[RegistrationOut])
def my_registrations(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_verified_user)]):
    regs = (
        db.query(Registration)
        .options(
            joinedload(Registration.event),
            joinedload(Registration.ticket_type),
            joinedload(Registration.payment),
            joinedload(Registration.ticket),
        )
        .filter(Registration.user_id == user.id)
        .order_by(Registration.created_at.desc())
        .all()
    )
    return regs


@router.get("/{registration_id}", response_model=RegistrationOut)
def get_registration(
    registration_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_verified_user)],
):
    reg = _load_full(db, registration_id)
    if reg.user_id != user.id and user.role.value != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your registration.")
    return reg
