import uuid
from typing import Annotated, Iterable

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.security import decode_token
from app.models.enums import UserRole
from app.models.user import User
from app.services.token_blacklist import is_blacklisted

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User:
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    if creds is None:
        raise unauthorized

    payload = decode_token(creds.credentials)
    if not payload or payload.get("type") != "access":
        raise unauthorized
    if payload.get("jti") and is_blacklisted(payload["jti"]):
        raise unauthorized

    try:
        user_id = uuid.UUID(payload["sub"])
    except (KeyError, ValueError):
        raise unauthorized

    user = db.get(User, user_id)
    if user is None or not user.is_active:
        raise unauthorized
    return user


def get_current_user_optional(
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer_scheme)],
    db: Annotated[Session, Depends(get_db)],
) -> User | None:
    if creds is None:
        return None
    try:
        return get_current_user(creds, db)
    except HTTPException:
        return None


def get_verified_user(user: Annotated[User, Depends(get_current_user)]) -> User:
    """Attendee-level actions (register for an event, buy a ticket, etc.)
    require a verified email -- an unregistered/unverified visitor can browse
    only."""
    if not user.is_email_verified:
        raise HTTPException(
            status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before doing this.",
        )
    return user


def require_roles(*roles: UserRole):
    def dependency(user: Annotated[User, Depends(get_verified_user)]) -> User:
        if user.role not in roles and user.role != UserRole.ADMIN:
            raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not have permission to do this.")
        return user

    return dependency


require_organizer = require_roles(UserRole.ORGANIZER)
require_admin = require_roles(UserRole.ADMIN)


def assert_event_staff_access(db, event_id: uuid.UUID, user: User):
    """Organizer (owner), admin, or an accepted event-scoped staff member
    may verify/check-in tickets for this event. Everyone else is denied,
    including staff accepted for a *different* event -- this is the
    unauthorized-staff-action guard the PRD calls out explicitly."""
    from app.models.event import Event
    from app.models.staff import EventStaff

    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Event not found.")
    if event.organizer_id == user.id or user.role == UserRole.ADMIN:
        return event

    is_staff = (
        db.query(EventStaff)
        .filter(EventStaff.event_id == event_id, EventStaff.user_id == user.id, EventStaff.accepted.is_(True))
        .first()
    )
    if not is_staff:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You are not authorized to verify tickets for this event.")
    return event
