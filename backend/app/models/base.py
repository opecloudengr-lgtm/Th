import enum
import uuid
from datetime import datetime

from sqlalchemy import DateTime, func
from sqlalchemy import Enum as SAEnum
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.core.database import Base


def str_enum(enum_cls: type[enum.Enum], name: str, **kwargs):
    """Postgres ENUM column that stores the Python str-Enum's *value*
    (e.g. "attendee") rather than SQLAlchemy's default of the member name
    (e.g. "ATTENDEE") -- keeps raw SQL/reporting/exports human-readable."""
    return SAEnum(enum_cls, name=name, values_callable=lambda obj: [e.value for e in obj], **kwargs)


class UUIDMixin:
    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
    )
