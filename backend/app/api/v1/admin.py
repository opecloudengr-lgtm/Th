import uuid
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import require_admin
from app.models.enums import EventStatus, PaymentStatus, UserRole
from app.models.checkin import CheckIn
from app.models.event import Event
from app.models.payment import Payment
from app.models.ticket import Registration, Ticket
from app.models.user import User
from app.schemas.admin import AdminEventRow, AdminPaymentRow, AdminUserRow, AdminUserUpdate, PlatformReport
from app.services.audit_service import log_action

router = APIRouter(prefix="/admin", tags=["admin"])


@router.get("/users", response_model=list[AdminUserRow])
def list_users(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
    q: str | None = None,
    role: UserRole | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    query = db.query(User)
    if q:
        like = f"%{q}%"
        query = query.filter((User.email.ilike(like)) | (User.first_name.ilike(like)) | (User.last_name.ilike(like)))
    if role:
        query = query.filter(User.role == role)
    return query.order_by(User.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()


@router.patch("/users/{user_id}", response_model=AdminUserRow)
def update_user(
    user_id: uuid.UUID,
    payload: AdminUserUpdate,
    db: Annotated[Session, Depends(get_db)],
    admin: Annotated[User, Depends(require_admin)],
):
    target = db.get(User, user_id)
    if not target:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="User not found.")
    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(target, field, value)
    log_action(db, actor_id=admin.id, action="admin.update_user", resource_type="user", resource_id=str(target.id), metadata=data)
    db.commit()
    db.refresh(target)
    return target


@router.get("/events", response_model=list[AdminEventRow])
def list_events(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
    status_filter: EventStatus | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    query = db.query(Event).options(joinedload(Event.organizer))
    if status_filter:
        query = query.filter(Event.status == status_filter)
    events = query.order_by(Event.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()

    rows = []
    for e in events:
        reg_count = db.query(func.count(Registration.id)).filter(Registration.event_id == e.id).scalar() or 0
        revenue = (
            db.query(func.coalesce(func.sum(Payment.amount), 0))
            .join(Registration, Registration.id == Payment.registration_id)
            .filter(Registration.event_id == e.id, Payment.status == PaymentStatus.SUCCESS)
            .scalar()
            or Decimal("0")
        )
        rows.append(
            AdminEventRow(
                id=e.id, title=e.title, slug=e.slug, status=e.status,
                organizer_name=e.organizer.full_name, organizer_email=e.organizer.email,
                registrations=reg_count, revenue=revenue, created_at=e.created_at,
            )
        )
    return rows


@router.post("/events/{event_id}/suspend", response_model=AdminEventRow)
def suspend_event(
    event_id: uuid.UUID, db: Annotated[Session, Depends(get_db)], admin: Annotated[User, Depends(require_admin)]
):
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Event not found.")
    event.status = EventStatus.CANCELLED
    log_action(db, actor_id=admin.id, action="admin.suspend_event", resource_type="event", resource_id=str(event.id))
    db.commit()
    reg_count = db.query(func.count(Registration.id)).filter(Registration.event_id == event.id).scalar() or 0
    return AdminEventRow(
        id=event.id, title=event.title, slug=event.slug, status=event.status,
        organizer_name=event.organizer.full_name, organizer_email=event.organizer.email,
        registrations=reg_count, revenue=Decimal("0"), created_at=event.created_at,
    )


@router.get("/payments", response_model=list[AdminPaymentRow])
def list_payments(
    db: Annotated[Session, Depends(get_db)],
    _admin: Annotated[User, Depends(require_admin)],
    status_filter: PaymentStatus | None = Query(default=None, alias="status"),
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=50, ge=1, le=200),
):
    query = db.query(Payment).options(joinedload(Payment.registration).joinedload(Registration.event))
    if status_filter:
        query = query.filter(Payment.status == status_filter)
    payments = query.order_by(Payment.created_at.desc()).offset((page - 1) * page_size).limit(page_size).all()
    return [
        AdminPaymentRow(
            id=p.id, reference=p.paystack_reference, amount=p.amount, currency=p.currency, status=p.status,
            event_title=p.registration.event.title, attendee_email=p.registration.email, created_at=p.created_at,
        )
        for p in payments
    ]


@router.get("/reports", response_model=PlatformReport)
def platform_report(db: Annotated[Session, Depends(get_db)], _admin: Annotated[User, Depends(require_admin)]):
    total_users = db.query(func.count(User.id)).scalar() or 0
    total_organizers = db.query(func.count(User.id)).filter(User.role == UserRole.ORGANIZER).scalar() or 0
    total_events = db.query(func.count(Event.id)).scalar() or 0
    published_events = db.query(func.count(Event.id)).filter(Event.status == EventStatus.PUBLISHED).scalar() or 0
    total_registrations = db.query(func.count(Registration.id)).scalar() or 0
    total_tickets = db.query(func.count(Ticket.id)).scalar() or 0
    total_revenue = db.query(func.coalesce(func.sum(Payment.amount), 0)).filter(Payment.status == PaymentStatus.SUCCESS).scalar() or Decimal("0")
    total_checkins = db.query(func.count(CheckIn.id)).scalar() or 0

    total_payment_attempts = db.query(func.count(Payment.id)).scalar() or 0
    successful_payments = db.query(func.count(Payment.id)).filter(Payment.status == PaymentStatus.SUCCESS).scalar() or 0
    success_rate = (successful_payments / total_payment_attempts * 100) if total_payment_attempts else 0.0

    return PlatformReport(
        total_users=total_users,
        total_organizers=total_organizers,
        total_events=total_events,
        published_events=published_events,
        total_registrations=total_registrations,
        total_tickets_issued=total_tickets,
        total_revenue=total_revenue,
        total_checkins=total_checkins,
        payment_success_rate=success_rate,
    )
