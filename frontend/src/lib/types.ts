export type UserRole = "attendee" | "organizer" | "admin";

export interface User {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  role: UserRole;
  is_email_verified: boolean;
  avatar_url: string | null;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  user: User;
}

export type EventCategory =
  | "conference" | "seminar" | "workshop" | "webinar" | "training" | "masterclass"
  | "summit" | "networking" | "wedding" | "birthday" | "graduation" | "anniversary"
  | "party" | "church_event" | "other";

export type EventFormat = "physical" | "online" | "hybrid";
export type RegistrationMode = "public" | "private";
export type EventStatus = "draft" | "published" | "cancelled" | "completed";
export type SectionType = "about" | "speakers" | "schedule" | "sponsors" | "gallery" | "faq" | "contact";

export interface TicketType {
  id: string;
  name: string;
  description: string | null;
  price: string;
  capacity: number | null;
  quantity_sold: number;
  is_vip: boolean;
  is_active: boolean;
  sales_start: string | null;
  sales_end: string | null;
}

export interface EventSection {
  id: string;
  section_type: SectionType;
  content: Record<string, unknown>;
  order: number;
}

export interface EventListItem {
  id: string;
  title: string;
  slug: string;
  category: EventCategory;
  event_format: EventFormat;
  registration_mode: RegistrationMode;
  status: EventStatus;
  city: string | null;
  country: string | null;
  start_at: string;
  end_at: string;
  cover_image_url: string | null;
  theme_color: string;
  currency: string;
  min_price: string | null;
  is_free: boolean;
}

export interface EventDetail {
  id: string;
  organizer_id: string;
  organizer: { id: string; first_name: string; last_name: string };
  title: string;
  slug: string;
  description: string | null;
  category: EventCategory;
  event_format: EventFormat;
  registration_mode: RegistrationMode;
  status: EventStatus;
  venue_name: string | null;
  address: string | null;
  city: string | null;
  country: string | null;
  online_url: string | null;
  start_at: string;
  end_at: string;
  timezone: string;
  cover_image_url: string | null;
  logo_url: string | null;
  theme_color: string;
  font_family: string;
  ticket_template: string;
  capacity: number | null;
  is_discoverable: boolean;
  currency: string;
  created_at: string;
  sections: EventSection[];
  ticket_types: TicketType[];
}

export type TicketStatus = "pending" | "active" | "used" | "revoked" | "expired" | "cancelled";
export type VipLevel = "regular" | "vip" | "vvip" | "chairman" | "special_guest" | "speaker" | "host" | "staff" | "media" | "custom";
export type RegistrationStatus = "pending" | "confirmed" | "cancelled";
export type PaymentStatus = "pending" | "success" | "failed";

export interface SeatBrief {
  id: string;
  section: string;
  row_label: string;
  number: string;
}

export interface Ticket {
  id: string;
  ticket_code: string;
  secure_token: string;
  vip_level: VipLevel;
  custom_vip_label: string | null;
  status: TicketStatus;
  issued_at: string | null;
  used_at: string | null;
  seat: SeatBrief | null;
}

export interface EventBrief {
  id: string;
  title: string;
  slug: string;
  start_at: string;
  end_at: string;
  venue_name: string | null;
  city: string | null;
  online_url: string | null;
  cover_image_url: string | null;
  theme_color: string;
  ticket_template: string;
}

export interface Payment {
  id: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  paystack_reference: string;
  paystack_authorization_url: string | null;
  paid_at: string | null;
}

export interface Registration {
  id: string;
  event_id: string;
  status: RegistrationStatus;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  event: EventBrief;
  ticket_type: { id: string; name: string; price: string };
  payment: Payment | null;
  ticket: Ticket | null;
}

export interface RegistrationResult {
  registration: Registration;
  requires_payment: boolean;
  payment_authorization_url: string | null;
}

export interface Seat {
  id: string;
  section: string;
  row_label: string;
  number: string;
  status: "available" | "reserved" | "assigned";
  label: string;
}

export type InvitationStatus = "pending" | "sent" | "accepted" | "declined";

export interface Invitation {
  id: string;
  event_id: string;
  guest_name: string;
  guest_email: string;
  guest_phone: string | null;
  vip_level: VipLevel;
  custom_vip_label: string | null;
  status: InvitationStatus;
  created_at: string;
}

export interface GuestInvitationView {
  guest_name: string;
  vip_level: VipLevel;
  custom_vip_label: string | null;
  status: InvitationStatus;
  event_title: string;
  event_start_at: string;
  event_venue: string | null;
  event_cover_image_url: string | null;
  theme_color: string;
  already_registered: boolean;
}

export interface EventStaffMember {
  id: string;
  event_id: string;
  role: "staff" | "manager";
  accepted: boolean;
  created_at: string;
  user: { id: string; first_name: string; last_name: string; email: string };
}

export interface TicketVerificationView {
  valid: boolean;
  reason: string | null;
  ticket_id: string | null;
  ticket_code: string | null;
  status: TicketStatus | null;
  attendee_name: string | null;
  ticket_type_name: string | null;
  vip_level: VipLevel | null;
  vip_label: string | null;
  seat_label: string | null;
  payment_status: PaymentStatus | null;
  is_free_ticket: boolean | null;
  event_title: string | null;
  already_checked_in: boolean;
  checked_in_at: string | null;
  checked_in_by: string | null;
}

export interface OrganizerOverview {
  total_events: number;
  published_events: number;
  total_registrations: number;
  tickets_sold: number;
  total_revenue: string;
  checked_in_count: number;
  pending_payments: number;
}

export interface EventDashboard {
  event_id: string;
  title: string;
  total_registrations: number;
  confirmed_registrations: number;
  tickets_sold: number;
  checked_in_count: number;
  attendance_rate: number;
  total_revenue: string;
  pending_payments: number;
  vip_attendance: number;
  capacity: number | null;
  by_ticket_type: { name: string; sold: number; capacity: number | null; price: string }[];
}

export interface ParticipantRow {
  registration_id: string;
  ticket_id: string | null;
  full_name: string;
  email: string;
  phone: string | null;
  ticket_type: string;
  ticket_code: string | null;
  ticket_status: TicketStatus | null;
  vip_level: VipLevel | null;
  vip_label: string | null;
  seat_label: string | null;
  payment_status: PaymentStatus | null;
  amount_paid: string | null;
  registered_at: string;
  checked_in: boolean;
  checked_in_at: string | null;
}

export interface NotificationItem {
  id: string;
  type: string;
  title: string;
  message: string;
  is_read: boolean;
  related_event_id: string | null;
  created_at: string;
}

export interface CheckInRow {
  id: string;
  ticket_id: string;
  method: "qr" | "manual";
  checked_in_at: string;
  staff_name: string | null;
  attendee_name: string;
  ticket_code: string;
  vip_level: VipLevel;
  seat_label: string | null;
}

export interface PlatformReport {
  total_users: number;
  total_organizers: number;
  total_events: number;
  published_events: number;
  total_registrations: number;
  total_tickets_issued: number;
  total_revenue: string;
  total_checkins: number;
  payment_success_rate: number;
}

export interface AdminUserRow {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  is_email_verified: boolean;
  created_at: string;
}

export interface AdminEventRow {
  id: string;
  title: string;
  slug: string;
  status: EventStatus;
  organizer_name: string;
  organizer_email: string;
  registrations: number;
  revenue: string;
  created_at: string;
}

export interface AdminPaymentRow {
  id: string;
  reference: string;
  amount: string;
  currency: string;
  status: PaymentStatus;
  event_title: string;
  attendee_email: string;
  created_at: string;
}

export interface ApiError {
  detail: string | { msg: string; loc: (string | number)[] }[];
}
