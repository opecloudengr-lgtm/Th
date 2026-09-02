import uuid

from sqlalchemy import Boolean, ForeignKey, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin, str_enum
from app.models.enums import StaffRole


class EventStaff(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "event_staff"
    __table_args__ = (UniqueConstraint("event_id", "user_id", name="uq_event_staff_user"),)

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True
    )
    role: Mapped[StaffRole] = mapped_column(str_enum(StaffRole, "staff_role"), default=StaffRole.STAFF, nullable=False)
    accepted: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    event = relationship("Event", back_populates="staff")
    user = relationship("User")
