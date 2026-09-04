import io

from PIL import Image

from tests.conftest import register_and_verify


def _png_bytes() -> bytes:
    buf = io.BytesIO()
    Image.new("RGB", (10, 10), color=(200, 50, 100)).save(buf, format="PNG")
    return buf.getvalue()


def test_upload_image_then_fetch_it(client, db):
    access, _ = register_and_verify(client, db, email="uploader@example.com", role="organizer")

    resp = client.post(
        "/api/v1/uploads/image",
        headers={"Authorization": f"Bearer {access}"},
        files={"file": ("cover.png", _png_bytes(), "image/png")},
    )
    assert resp.status_code == 201, resp.text
    url = resp.json()["url"]
    assert url.startswith("/api/v1/uploads/files/")

    fetch_resp = client.get(url)
    assert fetch_resp.status_code == 200
    assert fetch_resp.headers["content-type"] == "image/png"
    assert fetch_resp.content == _png_bytes()


def test_upload_image_requires_authentication(client):
    resp = client.post("/api/v1/uploads/image", files={"file": ("cover.png", _png_bytes(), "image/png")})
    assert resp.status_code == 401


def test_upload_rejects_non_image_file(client, db):
    access, _ = register_and_verify(client, db, email="uploader2@example.com", role="organizer")

    resp = client.post(
        "/api/v1/uploads/image",
        headers={"Authorization": f"Bearer {access}"},
        files={"file": ("notes.txt", b"just some text, not an image", "text/plain")},
    )
    assert resp.status_code == 400


def test_get_uploaded_file_blocks_path_traversal(client):
    resp = client.get("/api/v1/uploads/files/..%2F..%2Fapp%2Fmain.py")
    assert resp.status_code == 404
