import uuid
from datetime import datetime, timezone
from decimal import Decimal
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, or_
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user, get_current_user_optional, require_organizer
from app.models.enums import EventCategory, EventFormat, EventStatus, RegistrationMode, UserRole
from app.models.event import Event, EventSection, TicketType
from app.models.user import User
from app.schemas.event import (
    EventCreate,
    EventDetail,
    EventListItem,
    EventListResponse,
    EventSectionIn,
    EventUpdate,
    TicketTypeIn,
    TicketTypeOut,
)
from app.services.audit_service import log_action
from app.services.slug_service import unique_event_slug

router = APIRouter(prefix="/events", tags=["events"])


def _get_owned_event(db: Session, event_id: uuid.UUID, user: User) -> Event:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Event not found.")
    if event.organizer_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not own this event.")
    return event


def _min_price(event: Event) -> Decimal | None:
    prices = [t.price for t in event.ticket_types if t.is_active]
    return min(prices) if prices else None


def _to_list_item(event: Event) -> EventListItem:
    min_price = _min_price(event)
    return EventListItem(
        id=event.id,
        title=event.title,
        slug=event.slug,
        category=event.category,
        event_format=event.event_format,
        registration_mode=event.registration_mode,
        status=event.status,
        city=event.city,
        country=event.country,
        start_at=event.start_at,
        end_at=event.end_at,
        cover_image_url=event.cover_image_url,
        theme_color=event.theme_color,
        currency=event.currency,
        min_price=min_price,
        is_free=(min_price is None or min_price == 0),
    )


# ---------- Organizer: manage events ----------


@router.post("", response_model=EventDetail, status_code=status.HTTP_201_CREATED)
def create_event(
    payload: EventCreate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_organizer)],
):
    event = Event(
        organizer_id=user.id,
        slug=unique_event_slug(db, payload.title),
        **payload.model_dump(exclude={"title"}),
        title=payload.title,
    )
    db.add(event)
    db.flush()
    log_action(db, actor_id=user.id, action="event.create", resource_type="event", resource_id=str(event.id))
    db.commit()
    db.refresh(event)
    return event


@router.get("/mine", response_model=list[EventListItem])
def list_my_events(
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(require_organizer)],
):
    events = (
        db.query(Event)
        .options(joinedload(Event.ticket_types))
        .filter(Event.organizer_id == user.id)
        .order_by(Event.created_at.desc())
        .all()
    )
    return [_to_list_item(e) for e in events]


@router.get("/{event_id}/manage", response_model=EventDetail)
def get_event_for_manage(
    event_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    event = _get_owned_event(db, event_id, user)
    return event


@router.patch("/{event_id}", response_model=EventDetail)
def update_event(
    event_id: uuid.UUID,
    payload: EventUpdate,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    event = _get_owned_event(db, event_id, user)
    data = payload.model_dump(exclude_unset=True)
    if "title" in data and data["title"] != event.title:
        event.slug = unique_event_slug(db, data["title"])
    for field, value in data.items():
        setattr(event, field, value)
    if event.end_at <= event.start_at:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="end_at must be after start_at")
    log_action(db, actor_id=user.id, action="event.update", resource_type="event", resource_id=str(event.id))
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/publish", response_model=EventDetail)
def publish_event(
    event_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    event = _get_owned_event(db, event_id, user)
    if not event.ticket_types:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST, detail="Add at least one ticket type before publishing."
        )
    event.status = EventStatus.PUBLISHED
    log_action(db, actor_id=user.id, action="event.publish", resource_type="event", resource_id=str(event.id))
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/unpublish", response_model=EventDetail)
def unpublish_event(
    event_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    event = _get_owned_event(db, event_id, user)
    event.status = EventStatus.DRAFT
    db.commit()
    db.refresh(event)
    return event


@router.post("/{event_id}/cancel", response_model=EventDetail)
def cancel_event(
    event_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    event = _get_owned_event(db, event_id, user)
    event.status = EventStatus.CANCELLED
    log_action(db, actor_id=user.id, action="event.cancel", resource_type="event", resource_id=str(event.id))
    db.commit()
    db.refresh(event)
    return event


@router.delete("/{event_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_event(
    event_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    event = _get_owned_event(db, event_id, user)
    if event.registrations:
        raise HTTPException(
            status.HTTP_400_BAD_REQUEST,
            detail="This event has registrations and cannot be deleted. Cancel it instead.",
        )
    db.delete(event)
    db.commit()
    return None


# ---------- Sections ----------


@router.put("/{event_id}/sections", response_model=list[EventSectionIn])
def replace_sections(
    event_id: uuid.UUID,
    payload: list[EventSectionIn],
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    event = _get_owned_event(db, event_id, user)
    db.query(EventSection).filter(EventSection.event_id == event.id).delete()
    for s in payload:
        db.add(EventSection(event_id=event.id, section_type=s.section_type, content=s.content, order=s.order))
    db.commit()
    return payload


# ---------- Ticket types ----------


@router.post("/{event_id}/ticket-types", response_model=TicketTypeOut, status_code=status.HTTP_201_CREATED)
def create_ticket_type(
    event_id: uuid.UUID,
    payload: TicketTypeIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    event = _get_owned_event(db, event_id, user)
    tt = TicketType(event_id=event.id, **payload.model_dump())
    db.add(tt)
    db.commit()
    db.refresh(tt)
    return tt


@router.patch("/ticket-types/{ticket_type_id}", response_model=TicketTypeOut)
def update_ticket_type(
    ticket_type_id: uuid.UUID,
    payload: TicketTypeIn,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    tt = db.get(TicketType, ticket_type_id)
    if not tt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Ticket type not found.")
    _get_owned_event(db, tt.event_id, user)
    for field, value in payload.model_dump().items():
        setattr(tt, field, value)
    db.commit()
    db.refresh(tt)
    return tt


@router.delete("/ticket-types/{ticket_type_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_ticket_type(
    ticket_type_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    tt = db.get(TicketType, ticket_type_id)
    if not tt:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Ticket type not found.")
    _get_owned_event(db, tt.event_id, user)
    if tt.quantity_sold > 0:
        tt.is_active = False
        db.commit()
        return None
    db.delete(tt)
    db.commit()
    return None


# ---------- Public ----------


@router.get("", response_model=EventListResponse)
def list_public_events(
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
    category: EventCategory | None = None,
    event_format: EventFormat | None = None,
    city: str | None = None,
    is_free: bool | None = None,
    start_after: datetime | None = None,
    start_before: datetime | None = None,
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=50),
):
    query = db.query(Event).options(joinedload(Event.ticket_types)).filter(
        Event.status == EventStatus.PUBLISHED,
        or_(Event.registration_mode == RegistrationMode.PUBLIC, Event.is_discoverable.is_(True)),
    )

    if q:
        like = f"%{q}%"
        query = query.filter(or_(Event.title.ilike(like), Event.description.ilike(like), Event.city.ilike(like)))
    if category:
        query = query.filter(Event.category == category)
    if event_format:
        query = query.filter(Event.event_format == event_format)
    if city:
        query = query.filter(Event.city.ilike(f"%{city}%"))
    if start_after:
        query = query.filter(Event.start_at >= start_after)
    if start_before:
        query = query.filter(Event.start_at <= start_before)

    query = query.order_by(Event.start_at.asc())
    total = query.count()
    events = query.offset((page - 1) * page_size).limit(page_size).all()

    items = [_to_list_item(e) for e in events]
    if is_free is not None:
        items = [i for i in items if i.is_free == is_free]

    return EventListResponse(items=items, total=total, page=page, page_size=page_size)


@router.get("/{slug}", response_model=EventDetail)
def get_public_event(
    slug: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User | None, Depends(get_current_user_optional)],
):
    event = (
        db.query(Event)
        .options(joinedload(Event.sections), joinedload(Event.ticket_types), joinedload(Event.organizer))
        .filter(Event.slug == slug)
        .first()
    )
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Event not found.")

    is_owner_or_admin = user is not None and (user.id == event.organizer_id or user.role == UserRole.ADMIN)
    if event.status != EventStatus.PUBLISHED and not is_owner_or_admin:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Event not found.")

    return event
