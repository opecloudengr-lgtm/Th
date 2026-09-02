import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.enums import NotificationType, UserRole
from app.models.event import Event
from app.models.staff import EventStaff
from app.models.user import User
from app.schemas.staff import EventStaffOut, StaffInviteRequest
from app.services import notification_service
from app.services.audit_service import log_action

router = APIRouter(tags=["staff"])


def _get_owned_event(db: Session, event_id: uuid.UUID, user: User) -> Event:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Event not found.")
    if event.organizer_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not own this event.")
    return event


@router.post("/events/{event_id}/staff", response_model=EventStaffOut, status_code=status.HTTP_201_CREATED)
def invite_staff(
    event_id: uuid.UUID,
    payload: StaffInviteRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    event = _get_owned_event(db, event_id, user)

    staff_user = db.query(User).filter(User.email == str(payload.email).lower()).first()
    if not staff_user:
        raise HTTPException(
            status.HTTP_404_NOT_FOUND,
            detail="No EventPass account with that email. Ask them to register first, then invite them.",
        )

    existing = db.query(EventStaff).filter(EventStaff.event_id == event.id, EventStaff.user_id == staff_user.id).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="This user is already staff for this event.")

    membership = EventStaff(event_id=event.id, user_id=staff_user.id, role=payload.role, accepted=True)
    db.add(membership)
    log_action(db, actor_id=user.id, action="staff.invite", resource_type="event_staff", resource_id=str(staff_user.id))
    notification_service.notify(
        db,
        user=staff_user,
        type_=NotificationType.STAFF_INVITE,
        title=f"You're now staff for {event.title}",
        message="You can scan and verify tickets for this event from your dashboard.",
        related_event_id=event.id,
        also_email=True,
    )
    db.commit()
    db.refresh(membership)
    return membership


@router.get("/events/{event_id}/staff", response_model=list[EventStaffOut])
def list_staff(
    event_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    _get_owned_event(db, event_id, user)
    return (
        db.query(EventStaff)
        .options(joinedload(EventStaff.user))
        .filter(EventStaff.event_id == event_id)
        .order_by(EventStaff.created_at.desc())
        .all()
    )


@router.delete("/staff/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
def remove_staff(
    membership_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    membership = db.get(EventStaff, membership_id)
    if not membership:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Staff membership not found.")
    _get_owned_event(db, membership.event_id, user)
    db.delete(membership)
    db.commit()
    return None


@router.get("/staff/my-events", response_model=list[EventStaffOut])
def my_staff_events(db: Annotated[Session, Depends(get_db)], user: Annotated[User, Depends(get_current_user)]):
    return (
        db.query(EventStaff)
        .options(joinedload(EventStaff.user))
        .filter(EventStaff.user_id == user.id, EventStaff.accepted.is_(True))
        .all()
    )
