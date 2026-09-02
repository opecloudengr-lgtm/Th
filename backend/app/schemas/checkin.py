import uuid
from datetime import datetime

from pydantic import BaseModel, model_validator

from app.models.enums import CheckInMethod, PaymentStatus, TicketStatus, VipLevel


class VerifyTicketRequest(BaseModel):
    token: str | None = None
    ticket_code: str | None = None

    @model_validator(mode="after")
    def one_of(self):
        if not self.token and not self.ticket_code:
            raise ValueError("Provide either token or ticket_code")
        return self


class CheckInRequest(VerifyTicketRequest):
    method: CheckInMethod = CheckInMethod.QR
    device_info: str | None = None


class TicketVerificationView(BaseModel):
    valid: bool
    reason: str | None = None
    ticket_id: uuid.UUID | None = None
    ticket_code: str | None = None
    status: TicketStatus | None = None
    attendee_name: str | None = None
    ticket_type_name: str | None = None
    vip_level: VipLevel | None = None
    vip_label: str | None = None
    seat_label: str | None = None
    payment_status: PaymentStatus | None = None
    is_free_ticket: bool | None = None
    event_title: str | None = None
    already_checked_in: bool = False
    checked_in_at: datetime | None = None
    checked_in_by: str | None = None


class CheckInOut(BaseModel):
    id: uuid.UUID
    ticket_id: uuid.UUID
    method: CheckInMethod
    checked_in_at: datetime
    staff_name: str | None = None
    attendee_name: str
    ticket_code: str
    vip_level: VipLevel
    seat_label: str | None = None
