import uuid
from datetime import datetime
from decimal import Decimal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.models.enums import EventCategory, EventFormat, EventStatus, RegistrationMode, SectionType


class TicketTypeIn(BaseModel):
    name: str = Field(min_length=1, max_length=100)
    description: str | None = None
    price: Decimal = Field(default=Decimal("0"), ge=0)
    capacity: int | None = Field(default=None, ge=1)
    is_vip: bool = False
    sales_start: datetime | None = None
    sales_end: datetime | None = None


class TicketTypeOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    description: str | None
    price: Decimal
    capacity: int | None
    quantity_sold: int
    is_vip: bool
    is_active: bool
    sales_start: datetime | None
    sales_end: datetime | None

    @property
    def is_sold_out(self) -> bool:
        return self.capacity is not None and self.quantity_sold >= self.capacity


class EventSectionIn(BaseModel):
    section_type: SectionType
    content: dict = Field(default_factory=dict)
    order: int = 0


class EventSectionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    section_type: SectionType
    content: dict
    order: int


class EventCreate(BaseModel):
    title: str = Field(min_length=3, max_length=200)
    description: str | None = None
    category: EventCategory
    event_format: EventFormat
    registration_mode: RegistrationMode = RegistrationMode.PUBLIC
    venue_name: str | None = None
    address: str | None = None
    city: str | None = None
    country: str | None = None
    online_url: str | None = None
    start_at: datetime
    end_at: datetime
    timezone: str = "Africa/Lagos"
    cover_image_url: str | None = None
    logo_url: str | None = None
    theme_color: str = "#6D28D9"
    font_family: str = "Inter"
    ticket_template: str = "classic"
    capacity: int | None = None
    is_discoverable: bool = True
    currency: str = "NGN"

    @field_validator("end_at")
    @classmethod
    def end_after_start(cls, v: datetime, info) -> datetime:
        if "start_at" in info.data and v <= info.data["start_at"]:
            raise ValueError("end_at must be after start_at")
        return v


class EventUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=3, max_length=200)
    description: str | None = None
    category: EventCategory | None = None
    event_format: EventFormat | None = None
    registration_mode: RegistrationMode | None = None
    venue_name: str | None = None
    address: str | None = None
    city: str | None = None
    country: str | None = None
    online_url: str | None = None
    start_at: datetime | None = None
    end_at: datetime | None = None
    timezone: str | None = None
    cover_image_url: str | None = None
    logo_url: str | None = None
    theme_color: str | None = None
    font_family: str | None = None
    ticket_template: str | None = None
    capacity: int | None = None
    is_discoverable: bool | None = None
    currency: str | None = None


class OrganizerBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    first_name: str
    last_name: str


class EventListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    title: str
    slug: str
    category: EventCategory
    event_format: EventFormat
    registration_mode: RegistrationMode
    status: EventStatus
    city: str | None
    country: str | None
    start_at: datetime
    end_at: datetime
    cover_image_url: str | None
    theme_color: str
    currency: str
    min_price: Decimal | None = None
    is_free: bool = True


class EventDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    organizer_id: uuid.UUID
    organizer: OrganizerBrief
    title: str
    slug: str
    description: str | None
    category: EventCategory
    event_format: EventFormat
    registration_mode: RegistrationMode
    status: EventStatus
    venue_name: str | None
    address: str | None
    city: str | None
    country: str | None
    online_url: str | None
    start_at: datetime
    end_at: datetime
    timezone: str
    cover_image_url: str | None
    logo_url: str | None
    theme_color: str
    font_family: str
    ticket_template: str
    capacity: int | None
    is_discoverable: bool
    currency: str
    created_at: datetime
    sections: list[EventSectionOut] = []
    ticket_types: list[TicketTypeOut] = []


class EventListResponse(BaseModel):
    items: list[EventListItem]
    total: int
    page: int
    page_size: int
