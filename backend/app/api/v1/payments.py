import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.rate_limit import rate_limit
from app.models.enums import PaymentStatus
from app.models.payment import Payment
from app.models.user import User
from app.schemas.ticket import PaymentOut
from app.services.payment_service import confirm_payment_success, mark_payment_failed
from app.services.paystack_service import PaystackError, verify_transaction, verify_webhook_signature

logger = logging.getLogger("eventpass.payments")

router = APIRouter(prefix="/payments", tags=["payments"])


@router.post("/verify/{reference}", response_model=PaymentOut)
def verify_payment(
    reference: str,
    db: Annotated[Session, Depends(get_db)],
    user: Annotated[User, Depends(get_current_user)],
):
    """Client-triggered verification after the Paystack redirect. Never
    trusted alone -- we always re-verify server-side against Paystack, and
    the webhook below covers the case where the user closes the tab before
    this ever fires."""
    payment = db.query(Payment).filter(Payment.paystack_reference == reference).first()
    if not payment:
        raise HTTPException(status.HTTP_404_NOT_FOUND, detail="Payment not found.")
    if payment.registration.user_id != user.id and user.role.value != "admin":
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="Not your payment.")

    if payment.status == PaymentStatus.SUCCESS:
        return payment

    try:
        data = verify_transaction(reference)
    except PaystackError as exc:
        raise HTTPException(exc.status_code if exc.status_code != 502 else status.HTTP_502_BAD_GATEWAY, detail=str(exc))

    if data.get("status") == "success":
        try:
            confirm_payment_success(db, payment, data)
        except ValueError as exc:
            mark_payment_failed(db, payment, data)
            db.commit()
            raise HTTPException(status.HTTP_400_BAD_REQUEST, detail=str(exc))
    else:
        mark_payment_failed(db, payment, data)

    db.commit()
    db.refresh(payment)
    return payment


@router.post("/webhook", status_code=status.HTTP_200_OK)
async def paystack_webhook(request: Request, db: Annotated[Session, Depends(get_db)]):
    raw_body = await request.body()
    signature = request.headers.get("x-paystack-signature")

    if not verify_webhook_signature(raw_body, signature):
        logger.warning("Rejected Paystack webhook with invalid signature")
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid signature.")

    payload = await request.json()
    event = payload.get("event")
    data = payload.get("data", {})
    reference = data.get("reference")

    if event == "charge.success" and reference:
        payment = db.query(Payment).filter(Payment.paystack_reference == reference).first()
        if payment:
            # Re-verify server-side rather than trusting the webhook body alone.
            try:
                verified = verify_transaction(reference)
            except PaystackError:
                logger.exception("Webhook re-verification failed for %s", reference)
                return {"received": True}

            if verified.get("status") == "success":
                try:
                    confirm_payment_success(db, payment, verified)
                    db.commit()
                except ValueError:
                    logger.exception("Webhook amount mismatch for %s", reference)
                    db.rollback()

    return {"received": True}
