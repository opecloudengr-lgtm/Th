import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel

from app.models.enums import PaymentStatus, TicketStatus, VipLevel


class OrganizerOverview(BaseModel):
    total_events: int
    published_events: int
    total_registrations: int
    tickets_sold: int
    total_revenue: Decimal
    checked_in_count: int
    pending_payments: int


class EventDashboard(BaseModel):
    event_id: uuid.UUID
    title: str
    total_registrations: int
    confirmed_registrations: int
    tickets_sold: int
    checked_in_count: int
    attendance_rate: float
    total_revenue: Decimal
    pending_payments: int
    vip_attendance: int
    capacity: int | None
    by_ticket_type: list[dict]


class ParticipantRow(BaseModel):
    registration_id: uuid.UUID
    ticket_id: uuid.UUID | None
    full_name: str
    email: str
    phone: str | None
    ticket_type: str
    ticket_code: str | None
    ticket_status: TicketStatus | None
    vip_level: VipLevel | None
    vip_label: str | None
    seat_label: str | None
    payment_status: PaymentStatus | None
    amount_paid: Decimal | None
    registered_at: datetime
    checked_in: bool
    checked_in_at: datetime | None


class ParticipantListResponse(BaseModel):
    items: list[ParticipantRow]
    total: int
    page: int
    page_size: int
