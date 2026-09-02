import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models.enums import EventStatus, StaffRole


class StaffInviteRequest(BaseModel):
    email: EmailStr
    role: StaffRole = StaffRole.STAFF


class StaffUserBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    first_name: str
    last_name: str
    email: str


class StaffEventBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    slug: str
    status: EventStatus
    start_at: datetime
    venue_name: str | None
    city: str | None


class EventStaffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_id: uuid.UUID
    role: StaffRole
    accepted: bool
    created_at: datetime
    user: StaffUserBrief
    event: StaffEventBrief | None = None
