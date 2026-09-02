import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.enums import PaymentStatus, RegistrationStatus, TicketStatus, VipLevel


class RegisterForEventRequest(BaseModel):
    event_id: uuid.UUID
    ticket_type_id: uuid.UUID
    full_name: str | None = Field(default=None, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(default=None, max_length=30)


class PaymentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    amount: Decimal
    currency: str
    status: PaymentStatus
    paystack_reference: str
    paystack_authorization_url: str | None
    paid_at: datetime | None


class SeatBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    section: str
    row_label: str
    number: str


class TicketOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    ticket_code: str
    secure_token: str
    vip_level: VipLevel
    custom_vip_label: str | None
    status: TicketStatus
    issued_at: datetime | None
    used_at: datetime | None
    seat: SeatBrief | None = None


class EventBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    slug: str
    start_at: datetime
    end_at: datetime
    venue_name: str | None
    city: str | None
    online_url: str | None
    cover_image_url: str | None
    theme_color: str
    ticket_template: str


class TicketTypeBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    price: Decimal


class RegistrationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    event_id: uuid.UUID
    status: RegistrationStatus
    full_name: str
    email: str
    phone: str | None
    created_at: datetime
    event: EventBrief
    ticket_type: TicketTypeBrief
    payment: PaymentOut | None = None
    ticket: TicketOut | None = None


class RegistrationResult(BaseModel):
    registration: RegistrationOut
    requires_payment: bool
    payment_authorization_url: str | None = None
