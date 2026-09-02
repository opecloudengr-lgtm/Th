import uuid

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin
from app.models.enums import SeatStatus


class Seat(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "seats"
    __table_args__ = (UniqueConstraint("event_id", "section", "row_label", "number", name="uq_seat_position"),)

    event_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("events.id", ondelete="CASCADE"), nullable=False, index=True
    )
    section: Mapped[str] = mapped_column(String(80), nullable=False)
    row_label: Mapped[str] = mapped_column(String(20), nullable=False)
    number: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[SeatStatus] = mapped_column(
        Enum(SeatStatus, name="seat_status"), default=SeatStatus.AVAILABLE, nullable=False
    )

    event = relationship("Event", back_populates="seats")
    ticket = relationship("Ticket", back_populates="seat", uselist=False)

    @property
    def label(self) -> str:
        return f"{self.section}-{self.row_label}{self.number}"
