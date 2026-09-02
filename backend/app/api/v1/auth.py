from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.database import get_db
from app.core.deps import get_current_user
from app.core.rate_limit import rate_limit
from app.core.security import (
    create_token,
    decode_token,
    generate_secure_token,
    hash_password,
    verify_password,
)
from app.models.enums import NotificationType
from app.models.user import User
from app.schemas.user import (
    ChangePasswordRequest,
    ForgotPasswordRequest,
    LoginRequest,
    RefreshRequest,
    RegisterRequest,
    ResendVerificationRequest,
    ResetPasswordRequest,
    TokenResponse,
    UpdateProfileRequest,
    UserPublic,
    VerifyEmailRequest,
)
from app.services import notification_service
from app.services.audit_service import log_action
from app.services.email_service import send_password_reset_email, send_verification_email
from app.services.token_blacklist import blacklist_jti

router = APIRouter(prefix="/auth", tags=["auth"])


def _issue_tokens(user: User) -> TokenResponse:
    access = create_token(str(user.id), "access", {"role": user.role.value})
    refresh = create_token(str(user.id), "refresh")
    return TokenResponse(access_token=access, refresh_token=refresh, user=UserPublic.model_validate(user))


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(
    payload: RegisterRequest,
    db: Annotated[Session, Depends(get_db)],
    _rl: Annotated[None, Depends(rate_limit("register", 10, 3600))],
):
    existing = db.query(User).filter(User.email == payload.email.lower()).first()
    if existing:
        raise HTTPException(status.HTTP_409_CONFLICT, detail="An account with this email already exists.")

    user = User(
        first_name=payload.first_name.strip(),
        last_name=payload.last_name.strip(),
        email=payload.email.lower(),
        phone=payload.phone.strip(),
        password_hash=hash_password(payload.password),
        role=payload.role,
        email_verification_token=generate_secure_token(),
        email_verification_expires=datetime.now(timezone.utc)
        + timedelta(hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS),
    )
    db.add(user)
    db.flush()

    log_action(db, actor_id=user.id, action="user.register", resource_type="user", resource_id=str(user.id))
    notification_service.notify(
        db,
        user=user,
        type_=NotificationType.ACCOUNT_VERIFICATION,
        title="Verify your email",
        message="We've sent a verification link to your email address.",
    )
    db.commit()
    db.refresh(user)

    verify_url = f"{settings.FRONTEND_URL}/verify-email?token={user.email_verification_token}"
    send_verification_email(user.email, user.first_name, verify_url)

    return _issue_tokens(user)


@router.post("/verify-email", response_model=UserPublic)
def verify_email(payload: VerifyEmailRequest, db: Annotated[Session, Depends(get_db)]):
    user = db.query(User).filter(User.email_verification_token == payload.token).first()
    if not user:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired verification link.")

    if user.email_verification_expires and user.email_verification_expires < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="This verification link has expired.")

    user.is_email_verified = True
    user.email_verification_token = None
    user.email_verification_expires = None
    log_action(db, actor_id=user.id, action="user.verify_email", resource_type="user", resource_id=str(user.id))
    db.commit()
    db.refresh(user)
    return user


@router.post("/resend-verification", status_code=status.HTTP_202_ACCEPTED)
def resend_verification(
    payload: ResendVerificationRequest,
    db: Annotated[Session, Depends(get_db)],
    _rl: Annotated[None, Depends(rate_limit("resend_verification", 5, 3600))],
):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user and not user.is_email_verified:
        user.email_verification_token = generate_secure_token()
        user.email_verification_expires = datetime.now(timezone.utc) + timedelta(
            hours=settings.EMAIL_VERIFICATION_EXPIRE_HOURS
        )
        db.commit()
        verify_url = f"{settings.FRONTEND_URL}/verify-email?token={user.email_verification_token}"
        send_verification_email(user.email, user.first_name, verify_url)
    # Always return the same response to avoid leaking which emails are registered.
    return {"detail": "If that email exists, a verification link has been sent."}


@router.post("/login", response_model=TokenResponse)
def login(
    payload: LoginRequest,
    db: Annotated[Session, Depends(get_db)],
    _rl: Annotated[None, Depends(rate_limit("login", 15, 900))],
):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if not user or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password.")
    if not user.is_active:
        raise HTTPException(status.HTTP_403_FORBIDDEN, detail="This account has been deactivated.")

    log_action(db, actor_id=user.id, action="user.login", resource_type="user", resource_id=str(user.id))
    db.commit()
    return _issue_tokens(user)


@router.post("/refresh", response_model=TokenResponse)
def refresh_token(payload: RefreshRequest, db: Annotated[Session, Depends(get_db)]):
    unauthorized = HTTPException(status.HTTP_401_UNAUTHORIZED, detail="Invalid refresh token.")
    data = decode_token(payload.refresh_token)
    if not data or data.get("type") != "refresh":
        raise unauthorized
    from app.services.token_blacklist import is_blacklisted

    if data.get("jti") and is_blacklisted(data["jti"]):
        raise unauthorized

    import uuid as _uuid

    try:
        user_id = _uuid.UUID(data["sub"])
    except (KeyError, ValueError):
        raise unauthorized

    user = db.get(User, user_id)
    if not user or not user.is_active:
        raise unauthorized

    # Rotate: invalidate the used refresh token.
    blacklist_jti(data["jti"], data["exp"])
    return _issue_tokens(user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
def logout(payload: RefreshRequest):
    data = decode_token(payload.refresh_token)
    if data and data.get("jti"):
        blacklist_jti(data["jti"], data["exp"])
    return None


@router.post("/forgot-password", status_code=status.HTTP_202_ACCEPTED)
def forgot_password(
    payload: ForgotPasswordRequest,
    db: Annotated[Session, Depends(get_db)],
    _rl: Annotated[None, Depends(rate_limit("forgot_password", 5, 3600))],
):
    user = db.query(User).filter(User.email == payload.email.lower()).first()
    if user:
        user.password_reset_token = generate_secure_token()
        user.password_reset_expires = datetime.now(timezone.utc) + timedelta(
            minutes=settings.PASSWORD_RESET_EXPIRE_MINUTES
        )
        db.commit()
        reset_url = f"{settings.FRONTEND_URL}/reset-password?token={user.password_reset_token}"
        send_password_reset_email(user.email, user.first_name, reset_url)
    return {"detail": "If that email exists, a password reset link has been sent."}


@router.post("/reset-password", status_code=status.HTTP_200_OK)
def reset_password(
    payload: ResetPasswordRequest,
    db: Annotated[Session, Depends(get_db)],
    _rl: Annotated[None, Depends(rate_limit("reset_password", 10, 3600))],
):
    user = db.query(User).filter(User.password_reset_token == payload.token).first()
    if not user or not user.password_reset_expires or user.password_reset_expires < datetime.now(timezone.utc):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Invalid or expired reset link.")

    user.password_hash = hash_password(payload.new_password)
    user.password_reset_token = None
    user.password_reset_expires = None
    log_action(db, actor_id=user.id, action="user.reset_password", resource_type="user", resource_id=str(user.id))
    db.commit()
    return {"detail": "Password has been reset. You can now log in."}


@router.get("/me", response_model=UserPublic)
def get_me(user: Annotated[User, Depends(get_current_user)]):
    return user


@router.patch("/me", response_model=UserPublic)
def update_me(
    payload: UpdateProfileRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(user, field, value)
    db.commit()
    db.refresh(user)
    return user


@router.post("/change-password", status_code=status.HTTP_200_OK)
def change_password(
    payload: ChangePasswordRequest,
    user: Annotated[User, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if not verify_password(payload.current_password, user.password_hash):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Current password is incorrect.")
    user.password_hash = hash_password(payload.new_password)
    db.commit()
    return {"detail": "Password changed successfully."}
