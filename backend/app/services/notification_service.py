import uuid

from sqlalchemy.orm import Session

from app.models.enums import NotificationType
from app.models.notification import Notification
from app.models.user import User
from app.services.email_service import send_generic_notification_email


def notify(
    db: Session,
    *,
    user: User,
    type_: NotificationType,
    title: str,
    message: str,
    related_event_id: uuid.UUID | None = None,
    also_email: bool = False,
) -> Notification:
    n = Notification(
        user_id=user.id,
        type=type_,
        title=title,
        message=message,
        related_event_id=related_event_id,
    )
    db.add(n)
    if also_email:
        send_generic_notification_email(user.email, title, message)
    return n
