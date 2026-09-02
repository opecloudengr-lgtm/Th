import secrets

from slugify import slugify
from sqlalchemy.orm import Session

from app.models.event import Event


def unique_event_slug(db: Session, title: str) -> str:
    base = slugify(title)[:180] or "event"
    slug = base
    while db.query(Event).filter(Event.slug == slug).first() is not None:
        slug = f"{base}-{secrets.token_hex(3)}"
    return slug
