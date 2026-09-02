import uuid
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import Response
from sqlalchemy import func, or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import require_organizer
from app.models.enums import (
    EventStatus,
    PaymentStatus,
    RegistrationStatus,
    TicketStatus,
    UserRole,
    VipLevel,
)
from app.models.event import Event, TicketType
from app.models.payment import Payment
from app.models.ticket import Registration, Ticket
from app.models.user import User
from app.schemas.dashboard import (
    EventDashboard,
    OrganizerOverview,
    ParticipantListResponse,
    ParticipantRow,
)
from app.services.export_service import export_csv, export_pdf, export_xlsx

router = APIRouter(tags=["organizer"])


def _get_owned_event(db: Session, event_id: uuid.UUID, user: User) -> Event:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Event not found.")
    if event.organizer_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not own this event.")
    return event


@router.get("/organizer/overview", response_model=OrganizerOverview)
def organizer_overview(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(require_organizer)]):
    event_ids = [e.id for e in db.query(Event.id).filter(Event.organizer_id == user.id).all()]
    total_events = len(event_ids)
    published_events = (
        db.query(func.count(Event.id)).filter(Event.organizer_id == user.id, Event.status == EventStatus.PUBLISHED).scalar()
        or 0
    )
    if not event_ids:
        return OrganizerOverview(
            total_events=0, published_events=0, total_registrations=0, tickets_sold=0,
            total_revenue=Decimal("0"), checked_in_count=0, pending_payments=0,
        )

    total_registrations = (
        db.query(func.count(Registration.id)).filter(Registration.event_id.in_(event_ids)).scalar() or 0
    )
    tickets_sold = (
        db.query(func.count(Ticket.id))
        .join(Registration, Registration.id == Ticket.registration_id)
        .filter(Registration.event_id.in_(event_ids), Ticket.status != TicketStatus.CANCELLED)
        .scalar()
        or 0
    )
    total_revenue = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .join(Registration, Registration.id == Payment.registration_id)
        .filter(Registration.event_id.in_(event_ids), Payment.status == PaymentStatus.SUCCESS)
        .scalar()
        or Decimal("0")
    )
    checked_in_count = (
        db.query(func.count(Ticket.id))
        .join(Registration, Registration.id == Ticket.registration_id)
        .filter(Registration.event_id.in_(event_ids), Ticket.status == TicketStatus.USED)
        .scalar()
        or 0
    )
    pending_payments = (
        db.query(func.count(Payment.id))
        .join(Registration, Registration.id == Payment.registration_id)
        .filter(Registration.event_id.in_(event_ids), Payment.status == PaymentStatus.PENDING)
        .scalar()
        or 0
    )

    return OrganizerOverview(
        total_events=total_events,
        published_events=published_events,
        total_registrations=total_registrations,
        tickets_sold=tickets_sold,
        total_revenue=total_revenue,
        checked_in_count=checked_in_count,
        pending_payments=pending_payments,
    )


@router.get("/events/{event_id}/dashboard", response_model=EventDashboard)
def event_dashboard(
    event_id: uuid.UUID, db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(require_organizer)]
):
    event = _get_owned_event(db, event_id, user)

    total_registrations = db.query(func.count(Registration.id)).filter(Registration.event_id == event.id).scalar() or 0
    confirmed_registrations = (
        db.query(func.count(Registration.id))
        .filter(Registration.event_id == event.id, Registration.status == RegistrationStatus.CONFIRMED)
        .scalar()
        or 0
    )
    tickets_sold = (
        db.query(func.count(Ticket.id))
        .join(Registration, Registration.id == Ticket.registration_id)
        .filter(Registration.event_id == event.id, Ticket.status != TicketStatus.CANCELLED)
        .scalar()
        or 0
    )
    checked_in_count = (
        db.query(func.count(Ticket.id))
        .join(Registration, Registration.id == Ticket.registration_id)
        .filter(Registration.event_id == event.id, Ticket.status == TicketStatus.USED)
        .scalar()
        or 0
    )
    total_revenue = (
        db.query(func.coalesce(func.sum(Payment.amount), 0))
        .join(Registration, Registration.id == Payment.registration_id)
        .filter(Registration.event_id == event.id, Payment.status == PaymentStatus.SUCCESS)
        .scalar()
        or Decimal("0")
    )
    pending_payments = (
        db.query(func.count(Payment.id))
        .join(Registration, Registration.id == Payment.registration_id)
        .filter(Registration.event_id == event.id, Payment.status == PaymentStatus.PENDING)
        .scalar()
        or 0
    )
    vip_attendance = (
        db.query(func.count(Ticket.id))
        .join(Registration, Registration.id == Ticket.registration_id)
        .filter(
            Registration.event_id == event.id,
            Ticket.status == TicketStatus.USED,
            Ticket.vip_level != VipLevel.REGULAR,
        )
        .scalar()
        or 0
    )

    by_ticket_type = []
    for tt in db.query(TicketType).filter(TicketType.event_id == event.id).all():
        by_ticket_type.append(
            {"name": tt.name, "sold": tt.quantity_sold, "capacity": tt.capacity, "price": str(tt.price)}
        )

    return EventDashboard(
        event_id=event.id,
        title=event.title,
        total_registrations=total_registrations,
        confirmed_registrations=confirmed_registrations,
        tickets_sold=tickets_sold,
        checked_in_count=checked_in_count,
        attendance_rate=(checked_in_count / tickets_sold * 100) if tickets_sold else 0.0,
        total_revenue=total_revenue,
        pending_payments=pending_payments,
        vip_attendance=vip_attendance,
        capacity=event.capacity,
        by_ticket_type=by_ticket_type,
    )


def _participant_query(db: Session, event: Event, *, q: str | None, vip_only: bool | None,
                        ticket_type_id: uuid.UUID | None, payment_status: PaymentStatus | None,
                        checked_in: bool | None):
    query = (
        db.query(Registration)
        .options(
            joinedload(Registration.ticket_type),
            joinedload(Registration.ticket),
            joinedload(Registration.payment),
        )
        .filter(Registration.event_id == event.id, Registration.status != RegistrationStatus.CANCELLED)
    )
    if q:
        like = f"%{q}%"
        query = query.outerjoin(Ticket, Ticket.registration_id == Registration.id).filter(
            or_(
                Registration.full_name.ilike(like),
                Registration.email.ilike(like),
                Registration.phone.ilike(like),
                Ticket.ticket_code.ilike(like),
            )
        )
    if ticket_type_id:
        query = query.filter(Registration.ticket_type_id == ticket_type_id)
    return query


@router.get("/events/{event_id}/participants", response_model=ParticipantListResponse)
def list_participants(
    event_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_organizer)],
    q: str | None = None,
    vip_only: bool | None = None,
    ticket_type_id: uuid.UUID | None = None,
    payment_status: PaymentStatus | None = None,
    checked_in: bool | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=25, ge=1, le=200),
):
    event = _get_owned_event(db, event_id, user)
    query = _participant_query(
        db, event, q=q, vip_only=vip_only, ticket_type_id=ticket_type_id, payment_status=payment_status, checked_in=checked_in
    )
    registrations = query.order_by(Registration.created_at.desc()).all()

    rows: list[ParticipantRow] = []
    for r in registrations:
        ticket = r.ticket
        if vip_only and (not ticket or ticket.vip_level == VipLevel.REGULAR):
            continue
        if payment_status and (not r.payment or r.payment.status != payment_status):
            continue
        is_checked_in = bool(ticket and ticket.status == TicketStatus.USED)
        if checked_in is not None and is_checked_in != checked_in:
            continue
        rows.append(
            ParticipantRow(
                registration_id=r.id,
                ticket_id=ticket.id if ticket else None,
                full_name=r.full_name,
                email=r.email,
                phone=r.phone,
                ticket_type=r.ticket_type.name,
                ticket_code=ticket.ticket_code if ticket else None,
                ticket_status=ticket.status if ticket else None,
                vip_level=ticket.vip_level if ticket else None,
                vip_label=ticket.vip_display if ticket else None,
                seat_label=ticket.seat.label if ticket and ticket.seat else None,
                payment_status=r.payment.status if r.payment else None,
                amount_paid=r.payment.amount if (r.payment and r.payment.status == PaymentStatus.SUCCESS) else None,
                registered_at=r.created_at,
                checked_in=is_checked_in,
                checked_in_at=ticket.used_at if ticket else None,
            )
        )

    total = len(rows)
    start = (page - 1) * page_size
    page_rows = rows[start : start + page_size]
    return ParticipantListResponse(items=page_rows, total=total, page=page, page_size=page_size)


@router.get("/events/{event_id}/participants/export")
def export_participants(
    event_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_organizer)],
    format: str = Query(default="csv", pattern="^(csv|xlsx|pdf)$"),
):
    event = _get_owned_event(db, event_id, user)
    resp = list_participants(
        event_id, db, user, q=None, vip_only=None, ticket_type_id=None, payment_status=None,
        checked_in=None, page=1, page_size=100000,
    )
    rows = resp.items

    if format == "csv":
        content = export_csv(rows)
        media_type, ext = "text/csv", "csv"
    elif format == "xlsx":
        content = export_xlsx(rows)
        media_type, ext = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "xlsx"
    else:
        content = export_pdf(rows, event.title)
        media_type, ext = "application/pdf", "pdf"

    filename = f"{event.slug}-participants.{ext}"
    return Response(
        content=content, media_type=media_type, headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )
