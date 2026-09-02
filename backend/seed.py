"""Seed the database with realistic demo data for local development and
manual QA. Safe to re-run -- it skips records that already exist by email
/slug.

Usage:  python seed.py
"""

import sys
from datetime import datetime, timedelta, timezone
from decimal import Decimal

from app.core.database import SessionLocal
from app.core.security import generate_secure_token, hash_password
from app.models.enums import (
    EventCategory,
    EventFormat,
    EventStatus,
    InvitationStatus,
    RegistrationMode,
    RegistrationStatus,
    SectionType,
    StaffRole,
    UserRole,
    VipLevel,
)
from app.models.event import Event, EventSection, TicketType
from app.models.invitation import Invitation
from app.models.staff import EventStaff
from app.models.ticket import Registration
from app.models.user import User
from app.services.slug_service import unique_event_slug
from app.services.ticket_service import issue_ticket

now = datetime.now(timezone.utc)


def at(days_from_now: int, hour: int, minute: int = 0) -> datetime:
    """A realistic future timestamp (e.g. 9am, not 'whenever the seed script happened to run')."""
    d = (now + timedelta(days=days_from_now)).replace(hour=hour, minute=minute, second=0, microsecond=0)
    return d


def get_or_create_user(db, *, email, first_name, last_name, phone, role, password="Passw0rd!"):
    user = db.query(User).filter(User.email == email).first()
    if user:
        return user
    user = User(
        first_name=first_name,
        last_name=last_name,
        email=email,
        phone=phone,
        password_hash=hash_password(password),
        role=role,
        is_email_verified=True,
    )
    db.add(user)
    db.flush()
    return user


def get_or_create_event(db, organizer, **kwargs):
    title = kwargs.pop("title")
    existing = db.query(Event).filter(Event.title == title, Event.organizer_id == organizer.id).first()
    if existing:
        return existing
    event = Event(organizer_id=organizer.id, title=title, slug=unique_event_slug(db, title), **kwargs)
    db.add(event)
    db.flush()
    return event


def main():
    db = SessionLocal()
    try:
        print("Seeding EventPass demo data...")

        admin = get_or_create_user(
            db, email="admin@eventpass.io", first_name="Platform", last_name="Admin",
            phone="+2348000000000", role=UserRole.ADMIN, password="AdminPass123!",
        )
        organizer = get_or_create_user(
            db, email="organizer@eventpass.io", first_name="Zainab", last_name="Balogun",
            phone="+2348011112222", role=UserRole.ORGANIZER,
        )
        staff_user = get_or_create_user(
            db, email="staff@eventpass.io", first_name="Emeka", last_name="Chukwu",
            phone="+2348033334444", role=UserRole.ATTENDEE,
        )
        attendees = [
            get_or_create_user(
                db, email=f"attendee{i}@eventpass.io", first_name=n[0], last_name=n[1],
                phone=f"+23480{i:08d}", role=UserRole.ATTENDEE,
            )
            for i, n in enumerate(
                [("Ada", "Lovelace"), ("Femi", "Ade"), ("Ngozi", "Eze"), ("Tunde", "Bakare"), ("Sade", "Johnson")],
                start=1,
            )
        ]
        db.flush()

        # ---- Public paid conference ----
        conf = get_or_create_event(
            db, organizer,
            title="Lagos DevConnect 2026",
            description="A full day of talks, workshops and networking for builders across West Africa.",
            category=EventCategory.CONFERENCE, event_format=EventFormat.PHYSICAL,
            registration_mode=RegistrationMode.PUBLIC, status=EventStatus.PUBLISHED,
            venue_name="Landmark Event Centre", city="Lagos", country="Nigeria",
            start_at=at(30, 9), end_at=at(30, 18),
            theme_color="#7C3AED", currency="NGN", capacity=500, is_discoverable=True,
        )
        if not conf.ticket_types:
            db.add_all(
                [
                    TicketType(event_id=conf.id, name="Early Bird", price=Decimal("15000"), capacity=100, is_vip=False),
                    TicketType(event_id=conf.id, name="Standard", price=Decimal("25000"), capacity=300, is_vip=False),
                    TicketType(event_id=conf.id, name="VIP", price=Decimal("75000"), capacity=50, is_vip=True),
                ]
            )
            db.add(
                EventSection(
                    event_id=conf.id, section_type=SectionType.ABOUT, order=0,
                    content={"body": "Lagos DevConnect brings together 500+ engineers, designers and founders."},
                )
            )
            db.flush()

        # ---- Free public webinar ----
        webinar = get_or_create_event(
            db, organizer,
            title="Intro to Product Design Webinar",
            description="A free 90-minute live session on product design fundamentals.",
            category=EventCategory.WEBINAR, event_format=EventFormat.ONLINE,
            registration_mode=RegistrationMode.PUBLIC, status=EventStatus.PUBLISHED,
            online_url="https://meet.example.com/product-design", city=None, country=None,
            start_at=at(7, 17), end_at=at(7, 18, 30),
            theme_color="#059669", currency="NGN", is_discoverable=True,
        )
        if not webinar.ticket_types:
            db.add(TicketType(event_id=webinar.id, name="Free Seat", price=Decimal("0"), capacity=1000))
            db.flush()

        # ---- Private wedding ----
        wedding = get_or_create_event(
            db, organizer,
            title="Chidi & Amara's Wedding",
            description="Celebrating our forever. Strictly by invitation.",
            category=EventCategory.WEDDING, event_format=EventFormat.PHYSICAL,
            registration_mode=RegistrationMode.PRIVATE, status=EventStatus.PUBLISHED,
            venue_name="Civic Centre", city="Victoria Island", country="Nigeria",
            start_at=at(60, 14), end_at=at(60, 22),
            theme_color="#DB2777", currency="NGN", is_discoverable=False,
        )
        if not wedding.ticket_types:
            db.add(TicketType(event_id=wedding.id, name="Invited Guest", price=Decimal("0")))
            db.flush()

        db.commit()

        # ---- Staff assignment ----
        if not db.query(EventStaff).filter(EventStaff.event_id == conf.id, EventStaff.user_id == staff_user.id).first():
            db.add(EventStaff(event_id=conf.id, user_id=staff_user.id, role=StaffRole.STAFF, accepted=True))

        # ---- Free registrations + tickets for the webinar ----
        free_tt = webinar.ticket_types[0]
        for attendee in attendees[:3]:
            existing = db.query(Registration).filter(
                Registration.event_id == webinar.id, Registration.user_id == attendee.id
            ).first()
            if existing:
                continue
            reg = Registration(
                event_id=webinar.id, user_id=attendee.id, ticket_type_id=free_tt.id,
                full_name=attendee.full_name, email=attendee.email, phone=attendee.phone,
                status=RegistrationStatus.CONFIRMED,
            )
            db.add(reg)
            db.flush()
            issue_ticket(db, reg)

        # ---- A private wedding invitation, sent but not yet accepted ----
        if not db.query(Invitation).filter(Invitation.event_id == wedding.id, Invitation.guest_email == "guest@example.com").first():
            db.add(
                Invitation(
                    event_id=wedding.id, invited_by_id=organizer.id, ticket_type_id=wedding.ticket_types[0].id,
                    guest_name="Barrister Okonkwo", guest_email="guest@example.com",
                    vip_level=VipLevel.SPECIAL_GUEST, guest_token=generate_secure_token(24), status=InvitationStatus.SENT,
                )
            )

        db.commit()
        print("Done.")
        print("  Admin login:      admin@eventpass.io / AdminPass123!")
        print("  Organizer login:  organizer@eventpass.io / Passw0rd!")
        print("  Staff login:      staff@eventpass.io / Passw0rd!")
        print("  Attendee login:   attendee1@eventpass.io / Passw0rd!")
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


if __name__ == "__main__":
    sys.exit(main())
