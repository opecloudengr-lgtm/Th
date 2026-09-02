import uuid

from pydantic import BaseModel, ConfigDict, Field

from app.models.enums import SeatStatus


class SeatBulkCreateRequest(BaseModel):
    section: str = Field(min_length=1, max_length=80)
    row_labels: list[str] = Field(min_length=1)
    seats_per_row: int = Field(ge=1, le=200)


class SeatOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    section: str
    row_label: str
    number: str
    status: SeatStatus
    label: str


class SeatAssignRequest(BaseModel):
    ticket_id: uuid.UUID
