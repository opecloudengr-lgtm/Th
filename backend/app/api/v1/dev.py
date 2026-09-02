"""Dev-only helper so real testers can retrieve verification/reset/ticket
emails when no SMTP provider is configured yet. Disabled outside DEBUG."""

from pathlib import Path

from fastapi import APIRouter, HTTPException, status
from fastapi.responses import HTMLResponse

from app.core.config import settings

router = APIRouter(prefix="/dev", tags=["dev"])

OUTBOX_DIR = Path(settings.LOCAL_MEDIA_DIR) / "dev_outbox"


def _guard():
    if not settings.DEBUG:
        raise HTTPException(status.HTTP_404_NOT_FOUND)


@router.get("/outbox")
def list_outbox():
    _guard()
    if not OUTBOX_DIR.exists():
        return []
    files = sorted(OUTBOX_DIR.glob("*.html"), key=lambda p: p.stat().st_mtime, reverse=True)
    items = []
    for f in files[:50]:
        text = f.read_text(encoding="utf-8")
        first_line = text.split("\n", 1)[0]
        items.append({"id": f.stem, "preview": first_line.strip("<!-- ").strip(" -->")})
    return items


@router.get("/outbox/{email_id}", response_class=HTMLResponse)
def get_outbox_email(email_id: str):
    _guard()
    path = OUTBOX_DIR / f"{email_id}.html"
    if not path.exists():
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    return HTMLResponse(path.read_text(encoding="utf-8"))
