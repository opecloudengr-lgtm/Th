import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import JSON, DateTime, Enum, ForeignKey, Numeric, String
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.database import Base
from app.models.base import TimestampMixin, UUIDMixin
from app.models.enums import PaymentStatus


class Payment(UUIDMixin, TimestampMixin, Base):
    __tablename__ = "payments"

    registration_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("registrations.id", ondelete="CASCADE"), unique=True, nullable=False
    )
    amount: Mapped[Decimal] = mapped_column(Numeric(12, 2), nullable=False)
    currency: Mapped[str] = mapped_column(String(8), default="NGN", nullable=False)

    # Unique reference sent to Paystack. Never reused across attempts.
    paystack_reference: Mapped[str] = mapped_column(String(120), unique=True, index=True, nullable=False)
    paystack_access_code: Mapped[str | None] = mapped_column(String(120), nullable=True)
    paystack_authorization_url: Mapped[str | None] = mapped_column(String(500), nullable=True)

    status: Mapped[PaymentStatus] = mapped_column(
        Enum(PaymentStatus, name="payment_status"), default=PaymentStatus.PENDING, nullable=False
    )
    paid_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    raw_response: Mapped[dict | None] = mapped_column(JSON, nullable=True)
    webhook_verified: Mapped[bool] = mapped_column(default=False, nullable=False)

    registration = relationship("Registration", back_populates="payment")
