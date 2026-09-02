import uuid
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin
from app.models.enums import RegistrationStatus, TicketStatus, VipLevel


class Registration(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "registrations"

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True, index=True
    )
    ticket_type_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ticket_types.id", ondelete="RESTRICT"), nullable=False
    )
    invitation_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("invitations.id", ondelete="SET NULL"), nullable=True
    )

    full_name: Mapped[str] = mapped_column(String(200), nullable=False)
    email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    phone: Mapped[str | None] = mapped_column(String(30), nullable=True)

    status: Mapped[RegistrationStatus] = mapped_column(
        Enum(RegistrationStatus, name="registration_status"), default=RegistrationStatus.PENDING, nullable=False
    )
    is_guest_invite: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    event = relationship("Event", back_populates="registrations")
    user = relationship("User", back_populates="registrations")
    ticket_type = relationship("TicketType", back_populates="registrations")
    payment = relationship("Payment", back_populates="registration", uselist=False, cascade="all, delete-orphan")
    ticket = relationship("Ticket", back_populates="registration", uselist=False, cascade="all, delete-orphan")


class Ticket(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "tickets"

    registration_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("registrations.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    seat_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("seats.id", ondelete="SET NULL"), unique=True, nullable=True
    )

    ticket_code: Mapped[str] = mapped_column(String(30), unique=True, index=True, nullable=False)
    # Cryptographically secure opaque token embedded in the QR code. Never a
    # sequential ID -- see app.core.security.generate_secure_token.
    secure_token: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)

    vip_level: Mapped[VipLevel] = mapped_column(
        Enum(VipLevel, name="vip_level"), default=VipLevel.REGULAR, nullable=False
    )
    custom_vip_label: Mapped[str | None] = mapped_column(String(80), nullable=True)

    status: Mapped[TicketStatus] = mapped_column(
        Enum(TicketStatus, name="ticket_status"), default=TicketStatus.PENDING, nullable=False
    )

    issued_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_reason: Mapped[str | None] = mapped_column(String(255), nullable=True)

    registration = relationship("Registration", back_populates="ticket")
    seat = relationship("Seat", back_populates="ticket")
    checkin = relationship("CheckIn", back_populates="ticket", uselist=False, cascade="all, delete-orphan")

    @property
    def vip_display(self) -> str:
        return self.custom_vip_label or self.vip_level.value.replace("_", " ").title()
