import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload

from app.core.database import get_db
from app.core.deps import assert_event_staff_access, get_current_user
from app.models.checkin import CheckIn
from app.models.enums import TicketStatus
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.checkin import CheckInOut, CheckInRequest, TicketVerificationView, VerifyTicketRequest
from app.services.audit_service import log_action
from app.services.checkin_service import (
    CheckInConflict,
    build_verification_view,
    find_ticket,
    perform_atomic_checkin,
)

router = APIRouter(tags=["checkins"])


@router.post("/events/{event_id}/checkins/verify", response_model=TicketVerificationView)
def verify_ticket(
    event_id: uuid.UUID,
    payload: VerifyTicketRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    assert_event_staff_access(db, event_id, user)
    ticket = find_ticket(db, token=payload.token, ticket_code=payload.ticket_code)
    return build_verification_view(ticket, event_id)


@router.post("/events/{event_id}/checkins", response_model=TicketVerificationView)
def check_in_ticket(
    event_id: uuid.UUID,
    payload: CheckInRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    assert_event_staff_access(db, event_id, user)
    ticket = find_ticket(db, token=payload.token, ticket_code=payload.ticket_code)
    view = build_verification_view(ticket, event_id)

    if not view.valid:
        return view

    try:
        checkin = perform_atomic_checkin(db, ticket, user.id, payload.method, payload.device_info)
    except CheckInConflict as exc:
        db.rollback()
        refreshed = find_ticket(db, token=payload.token, ticket_code=payload.ticket_code)
        conflict_view = build_verification_view(refreshed, event_id)
        conflict_view.valid = False
        conflict_view.reason = str(exc)
        return conflict_view

    log_action(
        db, actor_id=user.id, action="ticket.checkin", resource_type="ticket", resource_id=str(ticket.id),
        metadata={"method": payload.method.value},
    )
    db.commit()

    # Report the check-in we just performed as a success, rather than
    # re-running eligibility checks against the now-USED ticket (which
    # would incorrectly report our own success as "already used").
    view.valid = True
    view.status = TicketStatus.USED
    view.checked_in_at = checkin.checked_in_at
    return view


@router.get("/events/{event_id}/checkins", response_model=list[CheckInOut])
def list_checkins(
    event_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    assert_event_staff_access(db, event_id, user)
    checkins = (
        db.query(CheckIn)
        .options(
            joinedload(CheckIn.ticket).joinedload(Ticket.registration),
            joinedload(CheckIn.ticket).joinedload(Ticket.seat),
        )
        .filter(CheckIn.event_id == event_id)
        .order_by(CheckIn.checked_in_at.desc())
        .all()
    )
    out = []
    for c in checkins:
        staff_name = None
        if c.staff_user_id:
            staff = db.get(User, c.staff_user_id)
            staff_name = staff.full_name if staff else None
        out.append(
            CheckInOut(
                id=c.id,
                ticket_id=c.ticket_id,
                method=c.method,
                checked_in_at=c.checked_in_at,
                staff_name=staff_name,
                attendee_name=c.ticket.registration.full_name,
                ticket_code=c.ticket.ticket_code,
                vip_level=c.ticket.vip_level,
                seat_label=c.ticket.seat.label if c.ticket.seat else None,
            )
        )
    return out
