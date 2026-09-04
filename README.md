# Nexora

A full-stack event registration, ticketing and access-control platform: organizers create and design events, sell free or paid tickets (Paystack), invite VIP guests to private events, assign seating, and verify entry at the door with cryptographically secure, single-use QR tickets. Built from the Nexora PRD as a real, production-oriented MVP — not a static prototype.

- **Backend:** FastAPI + PostgreSQL + SQLAlchemy + Alembic + Redis, JWT auth, server-authoritative Paystack payments, atomic check-in.
- **Frontend:** Next.js 16 (App Router) + TypeScript + Tailwind v4 + Framer Motion + TanStack Query.
- **Tests:** 23 automated pytest tests against a real Postgres database (auth, IDOR, payment idempotency, and a genuine multi-threaded concurrency test on check-in).

## Networking model (read this if login/register ever fails)

The **browser never calls the backend directly**. It always calls the Next.js server it loaded the page from, at a relative `/api/v1/...` path; a Next.js Route Handler (`frontend/src/app/api/[...path]/route.ts`) proxies that request server-side to the real backend, reading `BACKEND_INTERNAL_URL` (defaulting to `http://localhost:8000`) **fresh on every request**. This is why the same setup works unchanged on `localhost`, in GitHub Codespaces, or behind a real domain — the browser only ever needs to know one address (wherever it opened the page), and the backend address only has to be reachable from the *server*, which is a much easier problem (container-to-container networking, or plain `localhost` in dev) than guessing what URL a browser sitting on some other machine can reach. It also means the backend's CORS settings essentially don't matter for the app's own frontend, since server-to-server calls aren't subject to browser CORS at all.

A Route Handler is used here specifically instead of Next.js's `rewrites()` config: with `output: "standalone"` (used for the Docker build), `rewrites()` is resolved once into a static `routes-manifest.json` at `next build` time — so a runtime env var set later by Docker Compose or Codespaces would silently be ignored, and the proxy would stay pointed at whatever `BACKEND_INTERNAL_URL` was (or wasn't) set to during the image build. The Route Handler reads `process.env.BACKEND_INTERNAL_URL` at request time instead, so one built image works correctly wherever it's run, with no rebuild.

If you ever see every login/register/API call fail with a generic error, check this proxy first: confirm the backend is actually running and reachable from wherever the frontend is running, and that `BACKEND_INTERNAL_URL` points at it. A failed proxy now returns a clear `502` with `{"detail": "Backend unreachable..."}` instead of a generic error — check the frontend container's logs (`docker compose logs frontend`) for a `[api proxy] failed to reach backend at ...` line naming the exact URL it tried.

## Quick start (GitHub Codespaces — no local install)

1. Open this repo on GitHub, switch to this branch, **Code → Codespaces → Create codespace**.
2. In the Codespace terminal:
   ```bash
   cp backend/.env.example backend/.env
   ./scripts/dev-up.sh
   docker compose exec backend python seed.py   # demo accounts, run once
   ```
3. When Codespaces shows a "port 3000 available" notification, open it in the browser — that's the whole site, working end to end, no extra configuration needed.

Use `./scripts/dev-up.sh` instead of `docker compose up --build` in Codespaces specifically: verification/reset/ticket emails embed an absolute link built from `FRONTEND_URL`, and left at its plain-Docker default (`http://localhost:3000`) that link is dead for anyone opening the site through a Codespaces forwarded URL — "localhost:3000" means their own machine, not the Codespace. The script detects Codespaces (`CODESPACE_NAME`, which Codespaces sets itself) and points `FRONTEND_URL` at the real forwarded URL before starting Compose; everywhere else it's a no-op passthrough to `docker compose up --build`. If you already ran plain `docker compose up --build` and got a dead `localhost:3000` link in an email, fix it going forward with `export FRONTEND_URL="https://${CODESPACE_NAME}-3000.${GITHUB_CODESPACES_PORT_FORWARDING_DOMAIN:-app.github.dev}"` then `docker compose up -d --force-recreate backend` (no rebuild needed). Old emails already sent keep their old (dead) link — while logged in, visit `/verify-email` (no `?token=`) and use its "Resend verification email" button to get a fresh one, then open it from `/dev-outbox`.

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
cp .env.example .env.local                # optional -- defaults already point at a local backend on :8000
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

If any of these say "invalid email or password", the seed script hasn't been run against your current database yet — run `docker compose exec backend python seed.py` (or `python seed.py` in the non-Docker setup) and try again; it's safe to re-run.

## What's real vs. what needs your keys

Everything in this app is wired to real logic — nothing is mocked out. Two things specifically need *your* credentials before they're fully live, and degrade gracefully without them:

- **Payments (Paystack).** `backend/.env`'s `PAYSTACK_SECRET_KEY` / `PAYSTACK_PUBLIC_KEY` are placeholders. Without real keys, paid-ticket registration returns a clear 503 ("payments not configured") and does *not* leave any orphaned data. Add your Paystack keys (test or live) to go live — the integration (initialize → server-side verify → webhook, with HMAC signature verification and amount-mismatch protection) is fully implemented and tested against Paystack's real API contract.
- **Outbound email.** Without `SMTP_HOST` configured, verification/reset/ticket emails are logged and saved instead of sent — open **`/dev-outbox`** in the frontend (requires `DEBUG=true` in `backend/.env`, the default in `.env.example`) to read them and click the same verify/reset/ticket link a real email would contain, so you can test the full registration → verify → login flow without an SMTP provider. Add real SMTP credentials (or point at SendGrid/Resend's SMTP relay) to send real email instead.

**Image uploads** (event covers/logos, profile photos) are real drag-and-drop/click-to-browse file uploads (`POST /api/v1/uploads/image`) — validated server-side with Pillow (real image, JPEG/PNG/WEBP/GIF, 5MB max) and stored under `backend/media/uploads` (the `backend_media` Docker volume, so uploads survive container restarts). If `S3_BUCKET` and the other `S3_*` vars in `backend/.env` are set, uploads go there instead and the app returns the S3 URL directly; otherwise they're served back through `GET /api/v1/uploads/files/{name}`, proxied the same way as every other request.

## Deployment

This session doesn't have hosting, domain-registrar, or payment-provider credentials, so it can't hand you a live public URL directly — but the app is fully containerized and ready to deploy anywhere that runs Docker. A few options:

**Docker Compose on any VPS** (DigitalOcean, Hetzner, Linode, EC2, ...): copy the repo, fill in `backend/.env` with real secrets and your domain in `FRONTEND_URL`/`CORS_ORIGINS`, and run `docker compose up -d --build` behind a reverse proxy (Caddy or nginx) for TLS.

**Split deployment** (Vercel + Render/Railway):
- Backend → Render/Railway: deploy `backend/Dockerfile` (or their native Python buildpack running `alembic upgrade head && uvicorn app.main:app`), attach a managed Postgres and Redis, set the env vars from `backend/.env.example`. Note the backend's public URL.
- Frontend → Vercel: import the repo, set root directory to `frontend`, set `BACKEND_INTERNAL_URL` to that backend URL (a plain server-side env var, not `NEXT_PUBLIC_*` — no rebuild needed if you change it later). Vercel's rewrites proxy server-side same as anywhere else, so the browser still only ever talks to your Vercel domain.
- Point your domain's DNS at the frontend host, and set `FRONTEND_URL` on the backend to that domain (used in email links).

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
                      notifications, admin, uploads
    services/         Business logic: paystack, email, tickets, QR, PDF, exports,
                      check-in (atomic), audit log, notifications, token blacklist,
                      image uploads (local disk or S3)
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
