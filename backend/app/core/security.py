import secrets
from datetime import datetime, timedelta, timezone
from typing import Any, Literal

from jose import JWTError, jwt
from passlib.context import CryptContext

from app.core.config import settings

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

TokenType = Literal["access", "refresh"]


def hash_password(password: str) -> str:
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def create_token(subject: str, token_type: TokenType, extra_claims: dict[str, Any] | None = None) -> str:
    now = datetime.now(timezone.utc)
    if token_type == "access":
        expire = now + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    else:
        expire = now + timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS)

    to_encode: dict[str, Any] = {
        "sub": subject,
        "type": token_type,
        "iat": now,
        "exp": expire,
        "jti": secrets.token_urlsafe(16),
    }
    if extra_claims:
        to_encode.update(extra_claims)
    return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict[str, Any] | None:
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


def generate_secure_token(n_bytes: int = 32) -> str:
    """Cryptographically secure, URL-safe token. Used for ticket tokens,
    email verification, password reset and invitation links.
    Never derived from sequential IDs."""
    return secrets.token_urlsafe(n_bytes)


def generate_numeric_code(length: int = 6) -> str:
    return "".join(secrets.choice("0123456789") for _ in range(length))
