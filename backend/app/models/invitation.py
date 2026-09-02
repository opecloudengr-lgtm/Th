import uuid

from sqlalchemy import Enum, ForeignKey, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin
from app.models.enums import InvitationStatus, VipLevel


class Invitation(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "invitations"

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    invited_by_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    ticket_type_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("ticket_types.id", ondelete="SET NULL"), nullable=True
    )

    guest_name: Mapped[str] = mapped_column(String(200), nullable=False)
    guest_email: Mapped[str] = mapped_column(String(255), nullable=False, index=True)
    guest_phone: Mapped[str | None] = mapped_column(String(30), nullable=True)

    vip_level: Mapped[VipLevel] = mapped_column(
        Enum(VipLevel, name="vip_level", create_type=False), default=VipLevel.REGULAR, nullable=False
    )
    custom_vip_label: Mapped[str | None] = mapped_column(String(80), nullable=True)
    seat_id: Mapped[uuid.UUID | None] = mapped_column(
        UUID(as_uuid=True), ForeignKey("seats.id", ondelete="SET NULL"), nullable=True
    )

    # Opaque token guests use to view/accept their invite without an account.
    guest_token: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    status: Mapped[InvitationStatus] = mapped_column(
        Enum(InvitationStatus, name="invitation_status"), default=InvitationStatus.PENDING, nullable=False
    )

    event = relationship("Event", back_populates="invitations")
