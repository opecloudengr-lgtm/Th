import enum


class UserRole(str, enum.Enum):
    ATTENDEE = "attendee"
    ORGANIZER = "organizer"
    ADMIN = "admin"


class EventCategory(str, enum.Enum):
    CONFERENCE = "conference"
    SEMINAR = "seminar"
    WORKSHOP = "workshop"
    WEBINAR = "webinar"
    TRAINING = "training"
    MASTERCLASS = "masterclass"
    SUMMIT = "summit"
    NETWORKING = "networking"
    WEDDING = "wedding"
    BIRTHDAY = "birthday"
    GRADUATION = "graduation"
    ANNIVERSARY = "anniversary"
    PARTY = "party"
    CHURCH_EVENT = "church_event"
    OTHER = "other"


class EventFormat(str, enum.Enum):
    PHYSICAL = "physical"
    ONLINE = "online"
    HYBRID = "hybrid"


class RegistrationMode(str, enum.Enum):
    PUBLIC = "public"
    PRIVATE = "private"


class EventStatus(str, enum.Enum):
    DRAFT = "draft"
    PUBLISHED = "published"
    CANCELLED = "cancelled"
    COMPLETED = "completed"


class SectionType(str, enum.Enum):
    ABOUT = "about"
    SPEAKERS = "speakers"
    SCHEDULE = "schedule"
    SPONSORS = "sponsors"
    GALLERY = "gallery"
    FAQ = "faq"
    CONTACT = "contact"


class RegistrationStatus(str, enum.Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    CANCELLED = "cancelled"


class PaymentStatus(str, enum.Enum):
    PENDING = "pending"
    SUCCESS = "success"
    FAILED = "failed"


class TicketStatus(str, enum.Enum):
    PENDING = "pending"
    ACTIVE = "active"
    USED = "used"
    REVOKED = "revoked"
    EXPIRED = "expired"
    CANCELLED = "cancelled"


class VipLevel(str, enum.Enum):
    REGULAR = "regular"
    VIP = "vip"
    VVIP = "vvip"
    CHAIRMAN = "chairman"
    SPECIAL_GUEST = "special_guest"
    SPEAKER = "speaker"
    HOST = "host"
    STAFF = "staff"
    MEDIA = "media"
    CUSTOM = "custom"


class SeatStatus(str, enum.Enum):
    AVAILABLE = "available"
    RESERVED = "reserved"
    ASSIGNED = "assigned"


class InvitationStatus(str, enum.Enum):
    PENDING = "pending"
    SENT = "sent"
    ACCEPTED = "accepted"
    DECLINED = "declined"


class StaffRole(str, enum.Enum):
    STAFF = "staff"
    MANAGER = "manager"


class CheckInMethod(str, enum.Enum):
    QR = "qr"
    MANUAL = "manual"


class NotificationType(str, enum.Enum):
    ACCOUNT_VERIFICATION = "account_verification"
    REGISTRATION = "registration"
    PAYMENT_SUCCESS = "payment_success"
    TICKET_ISSUED = "ticket_issued"
    EVENT_UPDATE = "event_update"
    EVENT_CANCELLED = "event_cancelled"
    TICKET_REVOKED = "ticket_revoked"
    STAFF_INVITE = "staff_invite"
    INVITATION = "invitation"
