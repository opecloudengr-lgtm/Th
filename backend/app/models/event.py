import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, JSON, Numeric, String, Text
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin
from app.models.enums import EventCategory, EventFormat, EventStatus, RegistrationMode, SectionType


class Event(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "events"

    organizer_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )

    title: Mapped[str] = mapped_column(String(200), nullable=False)
    slug: Mapped[str] = mapped_column(String(220), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    category: Mapped[EventCategory] = mapped_column(Enum(EventCategory, name="event_category"), nullable=False)
    event_format: Mapped[EventFormat] = mapped_column(Enum(EventFormat, name="event_format"), nullable=False)
    registration_mode: Mapped[RegistrationMode] = mapped_column(
        Enum(RegistrationMode, name="registration_mode"), default=RegistrationMode.PUBLIC, nullable=False
    )
    status: Mapped[EventStatus] = mapped_column(
        Enum(EventStatus, name="event_status"), default=EventStatus.DRAFT, nullable=False
    )

    venue_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    address: Mapped[str | None] = mapped_column(String(500), nullable=True)
    city: Mapped[str | None] = mapped_column(String(120), nullable=True)
    country: Mapped[str | None] = mapped_column(String(120), nullable=True)
    online_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), nullable=False)
    timezone: Mapped[str] = mapped_column(String(64), default="Africa/Lagos", nullable=False)

    cover_image_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    logo_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
    theme_color: Mapped[str] = mapped_column(String(20), default="#6D28D9", nullable=False)
    font_family: Mapped[str] = mapped_column(String(80), default="Inter", nullable=False)
    ticket_template: Mapped[str] = mapped_column(String(40), default="classic", nullable=False)

    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_discoverable: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    currency: Mapped[str] = mapped_column(String(8), default="NGN", nullable=False)

    organizer = relationship("User", back_populates="events")
    sections = relationship(
        "EventSection", back_populates="event", cascade="all, delete-orphan", order_by="EventSection.order"
    )
    ticket_types = relationship("TicketType", back_populates="event", cascade="all, delete-orphan")
    registrations = relationship("Registration", back_populates="event", cascade="all, delete-orphan")
    seats = relationship("Seat", back_populates="event", cascade="all, delete-orphan")
    invitations = relationship("Invitation", back_populates="event", cascade="all, delete-orphan")
    staff = relationship("EventStaff", back_populates="event", cascade="all, delete-orphan")

    @property
    def is_published(self) -> bool:
        return self.status == EventStatus.PUBLISHED

    @property
    def is_free(self) -> bool:
        return all(Decimal(t.price) == 0 for t in self.ticket_types) if self.ticket_types else True


class EventSection(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "event_sections"

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    section_type: Mapped[SectionType] = mapped_column(Enum(SectionType, name="section_type"), nullable=False)
    content: Mapped[dict] = mapped_column(JSON, default=dict, nullable=False)
    order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    event = relationship("Event", back_populates="sections")


class TicketType(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "ticket_types"

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    price: Mapped[Decimal] = mapped_column(Numeric(12, 2), default=0, nullable=False)
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    quantity_sold: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_vip: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    sales_start: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    sales_end: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    event = relationship("Event", back_populates="ticket_types")
    registrations = relationship("Registration", back_populates="ticket_type")

    @property
    def is_sold_out(self) -> bool:
        return self.capacity is not None and self.quantity_sold >= self.capacity
