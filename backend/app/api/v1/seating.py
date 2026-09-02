import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.models.enums import SeatStatus, UserRole
from app.models.event import Event
from app.models.seat import Seat
from app.models.ticket import Ticket
from app.models.user import User
from app.schemas.seating import SeatAssignRequest, SeatBulkCreateRequest, SeatOut
from app.services.audit_service import log_action

router = APIRouter(tags=["seating"])


def _get_owned_event(db: Session, event_id: uuid.UUID, user: User) -> Event:
    event = db.get(Event, event_id)
    if not event:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Event not found.")
    if event.organizer_id != user.id and user.role != UserRole.ADMIN:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="You do not own this event.")
    return event


@router.post("/events/{event_id}/seats/bulk", response_model=list[SeatOut], status_code=status.HTTP_201_CREATED)
def bulk_create_seats(
    event_id: uuid.UUID,
    payload: SeatBulkCreateRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    event = _get_owned_event(db, event_id, user)
    created: list[Seat] = []
    for row in payload.row_labels:
        for n in range(1, payload.seats_per_row + 1):
            existing = (
                db.query(Seat)
                .filter(Seat.event_id == event.id, Seat.section == payload.section, Seat.row_label == row, Seat.number == str(n))
                .first()
            )
            if existing:
                continue
            seat = Seat(event_id=event.id, section=payload.section, row_label=row, number=str(n))
            db.add(seat)
            created.append(seat)
    db.commit()
    for s in created:
        db.refresh(s)
    return created


@router.get("/events/{event_id}/seats", response_model=list[SeatOut])
def list_seats(
    event_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    _get_owned_event(db, event_id, user)
    return db.query(Seat).filter(Seat.event_id == event_id).order_by(Seat.section, Seat.row_label, Seat.number).all()


@router.delete("/seats/{seat_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_seat(
    seat_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    seat = db.get(Seat, seat_id)
    if not seat:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Seat not found.")
    _get_owned_event(db, seat.event_id, user)
    if seat.status == SeatStatus.ASSIGNED:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Unassign this seat before deleting it.")
    db.delete(seat)
    db.commit()
    return None


@router.post("/seats/{seat_id}/assign", response_model=SeatOut)
def assign_seat(
    seat_id: uuid.UUID,
    payload: SeatAssignRequest,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    seat = db.get(Seat, seat_id)
    if not seat:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Seat not found.")
    event = _get_owned_event(db, seat.event_id, user)

    ticket = db.get(Ticket, payload.ticket_id)
    if not ticket or ticket.registration.event_id != event.id:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Ticket not found for this event.")
    if seat.status == SeatStatus.ASSIGNED and seat.ticket and seat.ticket.id != ticket.id:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="This seat is already assigned to another ticket.")
    if ticket.seat_id and ticket.seat_id != seat.id:
        previous = db.get(Seat, ticket.seat_id)
        if previous:
            previous.status = SeatStatus.AVAILABLE

    ticket.seat_id = seat.id
    seat.status = SeatStatus.ASSIGNED
    log_action(db, actor_id=user.id, action="seat.assign", resource_type="seat", resource_id=str(seat.id))
    db.commit()
    db.refresh(seat)
    return seat


@router.post("/seats/{seat_id}/release", response_model=SeatOut)
def release_seat(
    seat_id: uuid.UUID,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    seat = db.get(Seat, seat_id)
    if not seat:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Seat not found.")
    _get_owned_event(db, seat.event_id, user)
    if seat.ticket:
        seat.ticket.seat_id = None
    seat.status = SeatStatus.AVAILABLE
    db.commit()
    db.refresh(seat)
    return seat
