import io
from pathlib import Path

import boto3
from fastapi import HTTPException, UploadFile, status
from PIL import Image, UnidentifiedImageError

from app.core.config import settings
from app.core.security import generate_secure_token

UPLOAD_DIR = Path(settings.LOCAL_MEDIA_DIR) / "uploads"
MAX_UPLOAD_BYTES = 5 * 1024 * 1024  # 5 MB
ALLOWED_FORMATS = {"JPEG": ".jpg", "PNG": ".png", "WEBP": ".webp", "GIF": ".gif"}


async def save_image_upload(file: UploadFile) -> str:
    """Validates and stores an uploaded image, returning the path clients
    should use to fetch it back (relative -- proxied through /api the same
    way as every other request, so it works unchanged in Docker,
    Codespaces, or behind a real domain).

    Storage is local disk by default (fine for a single-instance deploy).
    If S3_BUCKET is configured, uploads go there instead and this returns
    the bucket's public URL directly, since S3 is genuinely
    internet-reachable (unlike our own backend container's address)."""
    raw = await file.read(MAX_UPLOAD_BYTES + 1)
    if len(raw) > MAX_UPLOAD_BYTES:
        raise HTTPException(status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="Image must be 5MB or smaller.")
    if not raw:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Empty file.")

    try:
        img = Image.open(io.BytesIO(raw))
        img.verify()
        # Re-open after verify() -- it leaves the image unusable for further ops.
        img = Image.open(io.BytesIO(raw))
        fmt = img.format
    except (UnidentifiedImageError, OSError):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="That doesn't look like a valid image file.")

    ext = ALLOWED_FORMATS.get(fmt or "")
    if not ext:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, detail="Use a JPEG, PNG, WEBP, or GIF image.")

    filename = f"{generate_secure_token(16)}{ext}"

    if settings.S3_BUCKET:
        return _upload_to_s3(filename, raw, fmt)

    UPLOAD_DIR.mkdir(parents=True, exist_ok=True)
    (UPLOAD_DIR / filename).write_bytes(raw)
    return f"/api/v1/uploads/files/{filename}"


def _upload_to_s3(filename: str, data: bytes, fmt: str) -> str:
    client = boto3.client(
        "s3",
        endpoint_url=settings.S3_ENDPOINT_URL or None,
        aws_access_key_id=settings.S3_ACCESS_KEY,
        aws_secret_access_key=settings.S3_SECRET_KEY,
    )
    key = f"uploads/{filename}"
    client.put_object(
        Bucket=settings.S3_BUCKET,
        Key=key,
        Body=data,
        ContentType=f"image/{fmt.lower()}",
        ACL="public-read",
    )
    base = settings.S3_PUBLIC_URL or f"{settings.S3_ENDPOINT_URL}/{settings.S3_BUCKET}"
    return f"{base.rstrip('/')}/{key}"
