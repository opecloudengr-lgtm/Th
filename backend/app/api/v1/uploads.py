from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, UploadFile, status
from fastapi.responses import FileResponse

from app.core.deps import get_verified_user
from app.core.rate_limit import rate_limit
from app.models.user import User
from app.services.upload_service import UPLOAD_DIR, save_image_upload

router = APIRouter(prefix="/uploads", tags=["uploads"])


@router.post("/image", status_code=status.HTTP_201_CREATED)
async def upload_image(
    file: UploadFile,
    _user: Annotated[User, Depends(get_verified_user)],
    _rl: Annotated[None, Depends(rate_limit("upload_image", 30, 3600))],
):
    """Stores an event cover/logo or profile avatar image and returns the
    URL to use for it. Real file upload -- not a URL you have to go find
    somewhere else and paste in."""
    url = await save_image_upload(file)
    return {"url": url}


@router.get("/files/{filename}")
def get_uploaded_file(filename: str):
    """Serves locally-stored uploads (S3-backed uploads are fetched
    directly from S3 and never hit this route). filename is a
    server-generated random token, never derived from user input beyond
    matching this pattern, so there's no path-traversal surface."""
    if "/" in filename or "\\" in filename or not filename:
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    path = UPLOAD_DIR / filename
    if not path.is_file():
        raise HTTPException(status.HTTP_404_NOT_FOUND)
    return FileResponse(path, headers={"Cache-Control": "public, max-age=31536000, immutable"})
