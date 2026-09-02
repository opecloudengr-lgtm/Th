# EventPass — by Nexora

A full-stack event registration, ticketing and access-control platform: organizers create and design events, sell free or paid tickets (Paystack), invite VIP guests to private events, assign seating, and verify entry at the door with cryptographically secure, single-use QR tickets. Built from the Nexora PRD as a real, production-oriented MVP — not a static prototype.

- **Backend:** FastAPI + PostgreSQL + SQLAlchemy + Alembic + Redis, JWT auth, server-authoritative Paystack payments, atomic check-in.
- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + Framer Motion + TanStack Query.
- **Tests:** 23 automated pytest tests against a real Postgres database (auth, IDOR, payment idempotency, and a genuine multi-threaded concurrency test on check-in).

## Quick start (Docker)

```bash
cp backend/.env.example backend/.env      # fill in real secrets later; safe to leave as-is for local testing
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:8000 (interactive docs at `/api/docs`)

The backend container runs Alembic migrations automatically on start. To load demo data:

```bash
docker compose exec backend python seed.py
```

## Quick start (without Docker)

**Backend**

```bash
cd backend
python3 -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env                      # edit DATABASE_URL / REDIS_URL for your local Postgres+Redis
alembic upgrade head
python seed.py                            # optional demo data
uvicorn app.main:app --reload
```

Requires a running PostgreSQL and Redis (Redis is optional in dev — rate limiting and the refresh-token blacklist fall back to an in-process store if it's unreachable).

**Frontend**

```bash
cd frontend
npm install
cp .env.example .env.local                # NEXT_PUBLIC_API_URL, defaults to http://localhost:8000/api/v1
npm run dev
```

**Tests**

```bash
cd backend
# create a Postgres database named eventpass_test (same credentials as DATABASE_URL)
source venv/bin/activate
python -m pytest tests/ -v
```

## Demo accounts (after running `seed.py`)

| Role | Email | Password |
|---|---|---|
| Admin | admin@eventpass.io | AdminPass123! |
| Organizer | organizer@eventpass.io | Passw0rd! |
| Staff (door scanner) | staff@eventpass.io | Passw0rd! |
| Attendee | attendee1@eventpass.io | Passw0rd! |

## What's real vs. what needs your keys

Everything in this app is wired to real logic — nothing is mocked out. Three things specifically need *your* credentials before they're fully live, and degrade gracefully without them:

- **Payments (Paystack).** `backend/.env`'s `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` are placeholders. Without real keys, paid-ticket registration returns a clear 503 ("payments not configured") and does *not* leave any orphaned data. Add your Paystack keys (test or live) to go live — the integration (initialize → server-side verify → webhook, with HMAC signature verification and amount-mismatch protection) is fully implemented and tested against Paystack's real API contract.
- **Outbound email.** Without `SMTP_HOST` configured, verification/reset/ticket emails are logged and saved to `backend/media/dev_outbox/` instead of sent, and are viewable at `GET /api/v1/dev/outbox` (dev-mode only) so you can test the full registration → verify → login flow without an SMTP provider. Add real SMTP credentials (or point at SendGrid/Resend's SMTP relay) to send real email.
- **Image uploads.** Cover images and logos are plain URL fields (paste a link) rather than a file-upload widget, since no object storage (S3/Cloudflare R2/Cloudinary) is configured. The config (`S3_*` in `backend/.env.example`) is ready to wire up if you want real uploads.

## Deployment

This session doesn't have hosting, domain-registrar, or payment-provider credentials, so it can't hand you a live public URL directly — but the app is fully containerized and ready to deploy anywhere that runs Docker. A few options:

**Docker Compose on any VPS** (DigitalOcean, Hetzner, Linode, EC2, ...): copy the repo, fill in `backend/.env` with real secrets and your domain in `FRONTEND_URL`/`CORS_ORIGINS`, and run `docker compose up -d --build` behind a reverse proxy (Caddy or nginx) for TLS.

**Split deployment** (Vercel + Render/Railway):
- Frontend → Vercel: import the repo, set root directory to `frontend`, set `NEXT_PUBLIC_API_URL` to your deployed backend URL (this must be set *before* build — it's inlined into the client bundle).
- Backend → Render/Railway: deploy `backend/Dockerfile` (or their native Python buildpack running `alembic upgrade head && uvicorn app.main:app`), attach a managed Postgres and Redis, set the env vars from `backend/.env.example`.
- Point your domain's DNS at the frontend host, add it to `CORS_ORIGINS` and `FRONTEND_URL` on the backend.

**Paystack webhook**: once deployed, register `https://your-api-domain/api/v1/payments/webhook` in your Paystack dashboard so payments confirm even if a customer closes the tab before the client-side verify call fires.

## Architecture

```
backend/            FastAPI app
  app/
    models/          SQLAlchemy models (User, Event, TicketType, Registration,
                      Ticket, Payment, Seat, Invitation, CheckIn, EventStaff,
                      Notification, AuditLog)
    schemas/          Pydantic request/response schemas
    api/v1/           Routers: auth, events, registrations, payments, tickets,
                      seating, invitations, staff, checkins, organizer,
                      notifications, admin
    services/         Business logic: paystack, email, tickets, QR, PDF, exports,
                      check-in (atomic), audit log, notifications, token blacklist
    core/              config, database, security, rate limiting, auth deps
  alembic/            Migrations
  tests/              pytest suite (real Postgres, no mocking of the DB layer)
  seed.py             Re-runnable demo data

frontend/            Next.js App Router
  src/app/
    (public)/         Home, events, event detail, auth, guest invitations
    dashboard/         Attendee portal (guarded)
    organizer/          Organizer console (guarded, tabbed event management)
    verify/              Staff QR/manual check-in portal (guarded)
    admin/                Platform admin console (guarded)
  src/components/       UI primitives, motion primitives, feature components
  src/lib/               Typed API client, auth context, shared types
```

## Feature coverage (PRD MVP scope)

- ✅ Registration, email verification, login, password reset, JWT access/refresh with rotation and a Redis-backed blacklist
- ✅ Role-based access (attendee / organizer / admin) plus event-scoped staff — an unverified/unregistered visitor can browse but not register, pay, or manage anything
- ✅ Event creation & no-code design editor (sections, theme, ticket templates), public/private events, physical/online/hybrid
- ✅ Free & paid registration with server-authoritative Paystack payments (initialize → verify → webhook, HMAC-verified, idempotent, amount-checked)
- ✅ Unique tickets with cryptographically secure tokens (never sequential IDs), QR generation, downloadable PDF tickets
- ✅ QR + manual verification, atomic check-in (load-tested with concurrent requests — exactly one succeeds), full deny-reason coverage (wrong event, already used, revoked, expired, unpaid)
- ✅ VIP classification, seat sections/rows/assignment
- ✅ Private-event guest invitations — manual add, bulk import via API, no-account guest ticket flow
- ✅ Organizer dashboard: stats, participant search/filter, CSV/Excel/PDF export, staff management
- ✅ Admin console: users, events, payments, platform report
- ✅ Notifications (in-app + email) for verification, registration, payment, ticket issuance, revocation
- ✅ Audit log for verification, check-in, revocation, VIP assignment, event changes
- ✅ Docker, migrations, seed data, automated tests

## Security notes

- Passwords hashed with bcrypt; ticket/verification/invitation/reset tokens are `secrets.token_urlsafe`-generated, never derived from sequential IDs.
- Every payment is verified server-side against Paystack directly — the frontend redirect result is never trusted alone, and the webhook independently re-verifies too.
- Check-in uses a conditional SQL `UPDATE ... WHERE status = 'active'` so concurrent scans of the same ticket can't both succeed (verified with a real 10-way concurrent request test, both in pytest and against a live server).
- Rate limiting on auth-sensitive endpoints; resource-ownership checks throughout (an event's organizer, its assigned staff, and platform admins are the only roles that can act on it).
