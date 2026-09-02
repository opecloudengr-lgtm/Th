import uuid

from sqlalchemy.orm import Session

from app.models.notification import AuditLog


def log_action(
    db: Session,
    *,
    actor_id: uuid.UUID | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    metadata: dict | None = None,
) -> None:
    entry = AuditLog(
        actor_id=actor_id,
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        meta=metadata or {},
    )
    db.add(entry)
