import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict

from app.models.enums import EventStatus, PaymentStatus, UserRole


class AdminUserRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    first_name: str
    last_name: str
    email: str
    role: UserRole
    is_active: bool
    is_email_verified: bool
    created_at: datetime


class AdminUserUpdate(BaseModel):
    is_active: bool | None = None
    role: UserRole | None = None


class AdminEventRow(BaseModel):
    id: uuid.UUID
    title: str
    slug: str
    status: EventStatus
    organizer_name: str
    organizer_email: str
    registrations: int
    revenue: Decimal
    created_at: datetime


class AdminPaymentRow(BaseModel):
    id: uuid.UUID
    reference: str
    amount: Decimal
    currency: str
    status: PaymentStatus
    event_title: str
    attendee_email: str
    created_at: datetime


class PlatformReport(BaseModel):
    total_users: int
    total_organizers: int
    total_events: int
    published_events: int
    total_registrations: int
    total_tickets_issued: int
    total_revenue: Decimal
    total_checkins: int
    payment_success_rate: float
