import uuid
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import InvitationStatus, VipLevel


class InvitationCreate(BaseModel):
    guest_name: str = Field(min_length=1, max_length=200)
    guest_email: EmailStr
    guest_phone: str | None = None
    ticket_type_id: uuid.UUID | None = None
    vip_level: VipLevel = VipLevel.REGULAR
    custom_vip_label: str | None = None
    seat_id: uuid.UUID | None = None


class InvitationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_id: uuid.UUID
    guest_name: str
    guest_email: str
    guest_phone: str | None
    vip_level: VipLevel
    custom_vip_label: str | None
    status: InvitationStatus
    created_at: datetime


class GuestInvitationView(BaseModel):
    guest_name: str
    vip_level: VipLevel
    custom_vip_label: str | None
    status: InvitationStatus
    event_title: str
    event_start_at: datetime
    event_venue: str | None
    event_cover_image_url: str | None
    theme_color: str
    already_registered: bool
