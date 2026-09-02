"""Server-side Paystack integration.

The frontend never talks to Paystack's secret key directly. We initialize
transactions here, and treat both the client-triggered verify call *and*
the Paystack webhook as equally authoritative confirmation paths -- per
the PRD, the frontend callback alone must never be trusted.
"""

import hashlib
import hmac
from decimal import Decimal

import httpx

from app.core.config import settings

PAYSTACK_NOT_CONFIGURED = "sk_test_placeholder"


class PaystackError(Exception):
    def __init__(self, message: str, status_code: int = 502):
        super().__init__(message)
        self.status_code = status_code


def is_configured() -> bool:
    return bool(settings.PAYSTACK_SECRET_KEY) and settings.PAYSTACK_SECRET_KEY != PAYSTACK_NOT_CONFIGURED


def _headers() -> dict:
    return {"Authorization": f"Bearer {settings.PAYSTACK_SECRET_KEY}", "Content-Type": "application/json"}


def to_subunit(amount: Decimal) -> int:
    """Paystack expects amounts in the currency's smallest unit (kobo for NGN)."""
    return int((amount * 100).to_integral_value())


def initialize_transaction(*, email: str, amount: Decimal, reference: str, currency: str, callback_url: str, metadata: dict) -> dict:
    if not is_configured():
        raise PaystackError(
            "Payments are not yet configured on this server. Add a real PAYSTACK_SECRET_KEY to enable paid tickets.",
            status_code=503,
        )
    payload = {
        "email": email,
        "amount": to_subunit(amount),
        "currency": currency,
        "reference": reference,
        "callback_url": callback_url,
        "metadata": metadata,
    }
    try:
        resp = httpx.post(
            f"{settings.PAYSTACK_BASE_URL}/transaction/initialize",
            json=payload,
            headers=_headers(),
            timeout=15,
        )
    except httpx.HTTPError as exc:
        raise PaystackError(f"Could not reach Paystack: {exc}") from exc

    data = resp.json()
    if not resp.is_success or not data.get("status"):
        raise PaystackError(data.get("message", "Paystack initialization failed"), status_code=502)
    return data["data"]


def verify_transaction(reference: str) -> dict:
    if not is_configured():
        raise PaystackError("Payments are not configured on this server.", status_code=503)
    try:
        resp = httpx.get(
            f"{settings.PAYSTACK_BASE_URL}/transaction/verify/{reference}",
            headers=_headers(),
            timeout=15,
        )
    except httpx.HTTPError as exc:
        raise PaystackError(f"Could not reach Paystack: {exc}") from exc

    data = resp.json()
    if not resp.is_success or not data.get("status"):
        raise PaystackError(data.get("message", "Paystack verification failed"), status_code=502)
    return data["data"]


def verify_webhook_signature(raw_body: bytes, signature_header: str | None) -> bool:
    if not signature_header or not settings.PAYSTACK_SECRET_KEY:
        return False
    computed = hmac.new(settings.PAYSTACK_SECRET_KEY.encode(), raw_body, hashlib.sha512).hexdigest()
    return hmac.compare_digest(computed, signature_header)
