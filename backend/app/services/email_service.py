import logging
import smtplib
import uuid
from email.message import EmailMessage
from pathlib import Path

from app.core.config import settings

logger = logging.getLogger("eventpass.email")

OUTBOX_DIR = Path(settings.LOCAL_MEDIA_DIR) / "dev_outbox"


def _dev_fallback(to_email: str, subject: str, html_body: str) -> None:
    """No SMTP configured: log the email and persist it so it can be
    inspected during local/staging testing (see GET /api/v1/dev/outbox)."""
    OUTBOX_DIR.mkdir(parents=True, exist_ok=True)
    file_id = f"{uuid.uuid4().hex}.html"
    (OUTBOX_DIR / file_id).write_text(
        f"<!-- To: {to_email} | Subject: {subject} -->\n{html_body}", encoding="utf-8"
    )
    logger.info("DEV EMAIL (no SMTP configured) -> %s | %s | saved as %s", to_email, subject, file_id)


def send_email(to_email: str, subject: str, html_body: str, text_body: str | None = None) -> None:
    if not settings.SMTP_HOST:
        _dev_fallback(to_email, subject, html_body)
        return

    msg = EmailMessage()
    msg["Subject"] = subject
    msg["From"] = f"{settings.SMTP_FROM_NAME} <{settings.SMTP_FROM_EMAIL}>"
    msg["To"] = to_email
    msg.set_content(text_body or "Please view this email in an HTML-capable client.")
    msg.add_alternative(html_body, subtype="html")

    try:
        with smtplib.SMTP(settings.SMTP_HOST, settings.SMTP_PORT, timeout=10) as server:
            if settings.SMTP_USE_TLS:
                server.starttls()
            if settings.SMTP_USERNAME:
                server.login(settings.SMTP_USERNAME, settings.SMTP_PASSWORD)
            server.send_message(msg)
        logger.info("Email sent to %s: %s", to_email, subject)
    except Exception:
        logger.exception("Failed to send email to %s, falling back to dev outbox", to_email)
        _dev_fallback(to_email, subject, html_body)


def _wrap(title: str, body_html: str, cta_label: str | None = None, cta_url: str | None = None) -> str:
    cta = (
        f'<a href="{cta_url}" style="display:inline-block;background:#6D28D9;color:#fff;'
        f'padding:12px 28px;border-radius:999px;text-decoration:none;font-weight:600;'
        f'margin-top:20px;">{cta_label}</a>'
        if cta_url
        else ""
    )
    return f"""
    <div style="font-family:-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:0 auto;
                background:#0B0B12;color:#F4F2FF;padding:36px;border-radius:20px;">
      <div style="font-size:22px;font-weight:800;letter-spacing:-0.02em;margin-bottom:24px;
                  background:linear-gradient(90deg,#A78BFA,#F472B6);-webkit-background-clip:text;
                  -webkit-text-fill-color:transparent;">EventPass</div>
      <h1 style="font-size:20px;margin:0 0 12px;">{title}</h1>
      <div style="font-size:15px;line-height:1.6;color:#C9C4E0;">{body_html}</div>
      {cta}
      <p style="margin-top:32px;font-size:12px;color:#6B6685;">
        Sent by EventPass &middot; if you didn't request this, you can ignore this email.
      </p>
    </div>
    """


def send_verification_email(to_email: str, first_name: str, verify_url: str) -> None:
    html = _wrap(
        f"Verify your email, {first_name}",
        "One click and you're in. This link expires in "
        f"{settings.EMAIL_VERIFICATION_EXPIRE_HOURS} hours.",
        cta_label="Verify email",
        cta_url=verify_url,
    )
    send_email(to_email, "Verify your EventPass account", html)


def send_password_reset_email(to_email: str, first_name: str, reset_url: str) -> None:
    html = _wrap(
        f"Reset your password, {first_name}",
        f"This link expires in {settings.PASSWORD_RESET_EXPIRE_MINUTES} minutes. "
        "If you didn't request this, you can safely ignore it.",
        cta_label="Reset password",
        cta_url=reset_url,
    )
    send_email(to_email, "Reset your EventPass password", html)


def send_ticket_email(to_email: str, first_name: str, event_title: str, ticket_url: str) -> None:
    html = _wrap(
        f"You're going to {event_title}! 🎟️",
        f"Hi {first_name}, your ticket is ready. Download it, save the QR code, and present it at "
        "the entrance for check-in.",
        cta_label="View my ticket",
        cta_url=ticket_url,
    )
    send_email(to_email, f"Your ticket for {event_title}", html)


def send_invitation_email(to_email: str, guest_name: str, event_title: str, invite_url: str) -> None:
    html = _wrap(
        f"You're invited, {guest_name}!",
        f"You've been personally invited to <strong>{event_title}</strong>. "
        "Confirm your spot to receive your personalized ticket.",
        cta_label="View invitation",
        cta_url=invite_url,
    )
    send_email(to_email, f"You're invited to {event_title}", html)


def send_generic_notification_email(to_email: str, title: str, message: str) -> None:
    html = _wrap(title, message)
    send_email(to_email, title, html)
