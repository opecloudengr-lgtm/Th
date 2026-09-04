import Cookies from "js-cookie";
import type {
  AdminEventRow,
  AdminPaymentRow,
  AdminUserRow,
  CheckInRow,
  EventDashboard,
  EventDetail,
  EventListItem,
  EventSection,
  EventStaffMember,
  GuestInvitationView,
  Invitation,
  NotificationItem,
  OrganizerOverview,
  ParticipantRow,
  Payment,
  PlatformReport,
  Registration,
  RegistrationResult,
  Seat,
  Ticket,
  TicketType,
  TicketVerificationView,
  TokenResponse,
  User,
} from "./types";

// Relative by default: the browser calls this same origin at /api/v1/*, and
// src/app/api/[...path]/route.ts proxies that server-side to the real
// backend (see the comment there for why -- this makes auth/CORS work
// correctly regardless of what URL the frontend itself is reached at). Only
// set NEXT_PUBLIC_API_URL if you specifically want the browser to call a
// backend directly instead of going through the proxy.
export const API_URL = process.env.NEXT_PUBLIC_API_URL || "/api/v1";

const ACCESS_KEY = "eventpass_access";
const REFRESH_KEY = "eventpass_refresh";

export const tokenStore = {
  get access() {
    return Cookies.get(ACCESS_KEY) || null;
  },
  get refresh() {
    return Cookies.get(REFRESH_KEY) || null;
  },
  set(tokens: { access_token: string; refresh_token: string }) {
    Cookies.set(ACCESS_KEY, tokens.access_token, { expires: 1, sameSite: "lax" });
    Cookies.set(REFRESH_KEY, tokens.refresh_token, { expires: 30, sameSite: "lax" });
  },
  clear() {
    Cookies.remove(ACCESS_KEY);
    Cookies.remove(REFRESH_KEY);
  },
};

export class ApiException extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

function extractMessage(body: unknown): string {
  if (body && typeof body === "object" && "detail" in body) {
    const detail = (body as { detail: unknown }).detail;
    if (typeof detail === "string") return detail;
    if (Array.isArray(detail)) {
      return detail.map((d) => (typeof d === "object" && d && "msg" in d ? String((d as { msg: unknown }).msg) : String(d))).join(", ");
    }
  }
  return "Something went wrong. Please try again.";
}

let refreshPromise: Promise<boolean> | null = null;

async function tryRefresh(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  if (!refreshPromise) {
    refreshPromise = fetch(`${API_URL}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refresh }),
    })
      .then(async (res) => {
        if (!res.ok) return false;
        const data: TokenResponse = await res.json();
        tokenStore.set(data);
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshPromise = null;
      });
  }
  return refreshPromise;
}

interface RequestOptions extends RequestInit {
  auth?: boolean;
  raw?: boolean;
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { auth = true, raw = false, headers, ...rest } = options;
  const doFetch = async (): Promise<Response> => {
    const h = new Headers(headers);
    if (!raw) h.set("Content-Type", "application/json");
    if (auth && tokenStore.access) h.set("Authorization", `Bearer ${tokenStore.access}`);
    return fetch(`${API_URL}${path}`, { ...rest, headers: h });
  };

  let res = await doFetch();

  if (res.status === 401 && auth && tokenStore.refresh) {
    const ok = await tryRefresh();
    if (ok) res = await doFetch();
  }

  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* no body */
    }
    throw new ApiException(extractMessage(body), res.status);
  }

  if (res.status === 204) return undefined as T;
  if (raw) return res as unknown as T;
  return res.json();
}

// ---------------- Auth ----------------
export const authApi = {
  register: (data: { first_name: string; last_name: string; email: string; phone: string; password: string; confirm_password: string; role?: string }) =>
    apiFetch<TokenResponse>("/auth/register", { method: "POST", body: JSON.stringify(data), auth: false }),
  login: (email: string, password: string) =>
    apiFetch<TokenResponse>("/auth/login", { method: "POST", body: JSON.stringify({ email, password }), auth: false }),
  verifyEmail: (token: string) => apiFetch<User>("/auth/verify-email", { method: "POST", body: JSON.stringify({ token }), auth: false }),
  resendVerification: (email: string) => apiFetch("/auth/resend-verification", { method: "POST", body: JSON.stringify({ email }), auth: false }),
  forgotPassword: (email: string) => apiFetch("/auth/forgot-password", { method: "POST", body: JSON.stringify({ email }), auth: false }),
  resetPassword: (token: string, new_password: string, confirm_password: string) =>
    apiFetch("/auth/reset-password", { method: "POST", body: JSON.stringify({ token, new_password, confirm_password }), auth: false }),
  me: () => apiFetch<User>("/auth/me"),
  updateProfile: (data: Partial<{ first_name: string; last_name: string; phone: string; avatar_url: string | null }>) =>
    apiFetch<User>("/auth/me", { method: "PATCH", body: JSON.stringify(data) }),
  changePassword: (current_password: string, new_password: string) =>
    apiFetch("/auth/change-password", { method: "POST", body: JSON.stringify({ current_password, new_password }) }),
  logout: () => {
    const refresh = tokenStore.refresh;
    tokenStore.clear();
    if (refresh) {
      fetch(`${API_URL}/auth/logout`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ refresh_token: refresh }) }).catch(() => {});
    }
  },
};

// ---------------- Events ----------------
export interface EventFilters {
  q?: string;
  category?: string;
  event_format?: string;
  city?: string;
  is_free?: boolean;
  page?: number;
  page_size?: number;
}

export const eventsApi = {
  list: (filters: EventFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== "" && v !== null) params.set(k, String(v));
    });
    return apiFetch<{ items: EventListItem[]; total: number; page: number; page_size: number }>(`/events?${params.toString()}`, { auth: false });
  },
  get: (slug: string) => apiFetch<EventDetail>(`/events/${slug}`, { auth: false }),
  mine: () => apiFetch<EventListItem[]>("/events/mine"),
  manage: (id: string) => apiFetch<EventDetail>(`/events/${id}/manage`),
  create: (data: Record<string, unknown>) => apiFetch<EventDetail>("/events", { method: "POST", body: JSON.stringify(data) }),
  update: (id: string, data: Record<string, unknown>) => apiFetch<EventDetail>(`/events/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  publish: (id: string) => apiFetch<EventDetail>(`/events/${id}/publish`, { method: "POST" }),
  unpublish: (id: string) => apiFetch<EventDetail>(`/events/${id}/unpublish`, { method: "POST" }),
  cancel: (id: string) => apiFetch<EventDetail>(`/events/${id}/cancel`, { method: "POST" }),
  remove: (id: string) => apiFetch<void>(`/events/${id}`, { method: "DELETE" }),
  setSections: (id: string, sections: { section_type: string; content: Record<string, unknown>; order: number }[]) =>
    apiFetch<EventSection[]>(`/events/${id}/sections`, { method: "PUT", body: JSON.stringify(sections) }),
  addTicketType: (id: string, data: Record<string, unknown>) =>
    apiFetch<TicketType>(`/events/${id}/ticket-types`, { method: "POST", body: JSON.stringify(data) }),
  updateTicketType: (ticketTypeId: string, data: Record<string, unknown>) =>
    apiFetch<TicketType>(`/events/ticket-types/${ticketTypeId}`, { method: "PATCH", body: JSON.stringify(data) }),
  removeTicketType: (ticketTypeId: string) => apiFetch<void>(`/events/ticket-types/${ticketTypeId}`, { method: "DELETE" }),
};

// ---------------- Registrations & Payments ----------------
export const registrationsApi = {
  register: (event_id: string, ticket_type_id: string) =>
    apiFetch<RegistrationResult>("/registrations", { method: "POST", body: JSON.stringify({ event_id, ticket_type_id }) }),
  mine: () => apiFetch<Registration[]>("/registrations/mine"),
  get: (id: string) => apiFetch<Registration>(`/registrations/${id}`),
};

export const paymentsApi = {
  verify: (reference: string) => apiFetch<Payment>(`/payments/verify/${reference}`, { method: "POST" }),
};

// ---------------- Tickets ----------------
export const ticketsApi = {
  get: (id: string) => apiFetch<Ticket>(`/tickets/${id}`),
  qrUrl: (id: string) => `${API_URL}/tickets/${id}/qr.png`,
  pdfUrl: (id: string) => `${API_URL}/tickets/${id}/pdf`,
  setVip: (id: string, vip_level: string, custom_vip_label?: string) =>
    apiFetch<Ticket>(`/tickets/${id}/vip`, { method: "PATCH", body: JSON.stringify({ vip_level, custom_vip_label }) }),
  revoke: (id: string, reason: string) => apiFetch<Ticket>(`/tickets/${id}/revoke`, { method: "POST", body: JSON.stringify({ reason }) }),
};

// ---------------- Seating ----------------
export const seatingApi = {
  bulkCreate: (eventId: string, section: string, row_labels: string[], seats_per_row: number) =>
    apiFetch<Seat[]>(`/events/${eventId}/seats/bulk`, { method: "POST", body: JSON.stringify({ section, row_labels, seats_per_row }) }),
  list: (eventId: string) => apiFetch<Seat[]>(`/events/${eventId}/seats`),
  remove: (seatId: string) => apiFetch<void>(`/seats/${seatId}`, { method: "DELETE" }),
  assign: (seatId: string, ticket_id: string) => apiFetch<Seat>(`/seats/${seatId}/assign`, { method: "POST", body: JSON.stringify({ ticket_id }) }),
  release: (seatId: string) => apiFetch<Seat>(`/seats/${seatId}/release`, { method: "POST" }),
};

// ---------------- Invitations ----------------
export const invitationsApi = {
  create: (eventId: string, data: Record<string, unknown>) =>
    apiFetch<Invitation>(`/events/${eventId}/invitations`, { method: "POST", body: JSON.stringify(data) }),
  bulkCreate: (eventId: string, data: Record<string, unknown>[]) =>
    apiFetch<Invitation[]>(`/events/${eventId}/invitations/bulk`, { method: "POST", body: JSON.stringify(data) }),
  list: (eventId: string) => apiFetch<Invitation[]>(`/events/${eventId}/invitations`),
  send: (id: string) => apiFetch<Invitation>(`/invitations/${id}/send`, { method: "POST" }),
  remove: (id: string) => apiFetch<void>(`/invitations/${id}`, { method: "DELETE" }),
  viewGuest: (token: string) => apiFetch<GuestInvitationView>(`/invite/${token}`, { auth: false }),
  acceptGuest: (token: string) => apiFetch<Registration>(`/invite/${token}/accept`, { method: "POST", auth: false }),
  guestTicket: (token: string) => apiFetch<Registration>(`/invite/${token}/ticket`, { auth: false }),
  guestTicketQrUrl: (token: string) => `${API_URL}/invite/${token}/ticket/qr.png`,
  guestTicketPdfUrl: (token: string) => `${API_URL}/invite/${token}/ticket/pdf`,
};

// ---------------- Staff ----------------
export const staffApi = {
  invite: (eventId: string, email: string, role: string = "staff") =>
    apiFetch<EventStaffMember>(`/events/${eventId}/staff`, { method: "POST", body: JSON.stringify({ email, role }) }),
  list: (eventId: string) => apiFetch<EventStaffMember[]>(`/events/${eventId}/staff`),
  remove: (membershipId: string) => apiFetch<void>(`/staff/${membershipId}`, { method: "DELETE" }),
  myEvents: () => apiFetch<EventStaffMember[]>("/staff/my-events"),
};

// ---------------- Check-ins ----------------
export const checkinsApi = {
  verify: (eventId: string, body: { token?: string; ticket_code?: string }) =>
    apiFetch<TicketVerificationView>(`/events/${eventId}/checkins/verify`, { method: "POST", body: JSON.stringify(body) }),
  checkin: (eventId: string, body: { token?: string; ticket_code?: string; method?: string; device_info?: string }) =>
    apiFetch<TicketVerificationView>(`/events/${eventId}/checkins`, { method: "POST", body: JSON.stringify(body) }),
  list: (eventId: string) => apiFetch<CheckInRow[]>(`/events/${eventId}/checkins`),
};

// ---------------- Organizer dashboards ----------------
export const organizerApi = {
  overview: () => apiFetch<OrganizerOverview>("/organizer/overview"),
  eventDashboard: (eventId: string) => apiFetch<EventDashboard>(`/events/${eventId}/dashboard`),
  participants: (eventId: string, params: Record<string, string> = {}) => {
    const qs = new URLSearchParams(params).toString();
    return apiFetch<{ items: ParticipantRow[]; total: number; page: number; page_size: number }>(`/events/${eventId}/participants?${qs}`);
  },
  exportUrl: (eventId: string, format: "csv" | "xlsx" | "pdf") => `${API_URL}/events/${eventId}/participants/export?format=${format}`,
};

// ---------------- Notifications ----------------
export const notificationsApi = {
  mine: () => apiFetch<NotificationItem[]>("/notifications/mine"),
  unreadCount: () => apiFetch<{ count: number }>("/notifications/unread-count"),
  markRead: (id: string) => apiFetch<NotificationItem>(`/notifications/${id}/read`, { method: "PATCH" }),
  markAllRead: () => apiFetch<void>("/notifications/read-all", { method: "POST" }),
};

// ---------------- Admin ----------------
export const adminApi = {
  users: (params: Record<string, string> = {}) => apiFetch<AdminUserRow[]>(`/admin/users?${new URLSearchParams(params)}`),
  updateUser: (id: string, data: Record<string, unknown>) => apiFetch<AdminUserRow>(`/admin/users/${id}`, { method: "PATCH", body: JSON.stringify(data) }),
  events: (params: Record<string, string> = {}) => apiFetch<AdminEventRow[]>(`/admin/events?${new URLSearchParams(params)}`),
  suspendEvent: (id: string) => apiFetch<AdminEventRow>(`/admin/events/${id}/suspend`, { method: "POST" }),
  payments: (params: Record<string, string> = {}) => apiFetch<AdminPaymentRow[]>(`/admin/payments?${new URLSearchParams(params)}`),
  reports: () => apiFetch<PlatformReport>("/admin/reports"),
};

// ---------------- Dev outbox (no SMTP configured) ----------------
export interface OutboxEmail {
  id: string;
  preview: string;
}

export const devApi = {
  outbox: () => apiFetch<OutboxEmail[]>("/dev/outbox", { auth: false }),
  outboxUrl: (id: string) => `${API_URL}/dev/outbox/${id}`,
};

// ---------------- Uploads ----------------
/** Uploads an image file (cover, logo, avatar). Bypasses apiFetch's
 * JSON-only body handling since this needs a multipart/form-data body with
 * no Content-Type set manually (the browser fills in the boundary). */
export async function uploadImage(file: File): Promise<{ url: string }> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_URL}/uploads/image`, {
    method: "POST",
    headers: tokenStore.access ? { Authorization: `Bearer ${tokenStore.access}` } : {},
    body: formData,
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {
      /* no body */
    }
    throw new ApiException(extractMessage(body), res.status);
  }
  return res.json();
}

export function authHeaderFetchInit(): RequestInit {
  return { headers: tokenStore.access ? { Authorization: `Bearer ${tokenStore.access}` } : {} };
}

/** Downloads an authenticated file (export, etc.) by fetching it with the
 * Bearer token attached and triggering a save via a temporary blob link --
 * a plain <a href> can't carry an Authorization header. */
export async function downloadWithAuth(url: string, filename: string) {
  const res = await fetch(url, { headers: tokenStore.access ? { Authorization: `Bearer ${tokenStore.access}` } : {} });
  if (!res.ok) throw new ApiException("Download failed.", res.status);
  const blob = await res.blob();
  const objectUrl = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = objectUrl;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(objectUrl);
}
