import os

os.environ.setdefault("DATABASE_URL", "postgresql+psycopg2://eventpass:eventpass@localhost:5432/eventpass_test")
os.environ.setdefault("RATE_LIMIT_ENABLED", "false")

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

from app.core.database import Base, get_db
from app.main import app

TEST_DATABASE_URL = "postgresql+psycopg2://eventpass:eventpass@localhost:5432/eventpass_test"

engine = create_engine(TEST_DATABASE_URL, future=True)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine, future=True)


@pytest.fixture(scope="session", autouse=True)
def _setup_database():
    import app.models  # noqa: F401  ensure all models are registered

    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    yield
    Base.metadata.drop_all(bind=engine)


@pytest.fixture(autouse=True)
def _clean_tables():
    yield
    with engine.begin() as conn:
        tables = ", ".join(f'"{t.name}"' for t in reversed(Base.metadata.sorted_tables))
        conn.execute(text(f"TRUNCATE {tables} RESTART IDENTITY CASCADE"))


@pytest.fixture
def db():
    session = TestingSessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    def override_get_db():
        try:
            yield db
        finally:
            pass

    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as c:
        yield c
    app.dependency_overrides.clear()


@pytest.fixture
def raw_client():
    """A TestClient that does NOT share a single DB session across requests
    -- each request gets its own real session against the test database, so
    concurrent requests from multiple threads behave like real independent
    HTTP requests (needed to genuinely exercise the atomic check-in race)."""
    with TestClient(app) as c:
        yield c


def register_and_verify(client, db, *, email, role="attendee", password="Passw0rd!1"):
    resp = client.post(
        "/api/v1/auth/register",
        json={
            "first_name": "Test",
            "last_name": "User",
            "email": email,
            "phone": "+2348010000000",
            "password": password,
            "confirm_password": password,
            "role": role,
        },
    )
    assert resp.status_code == 201, resp.text
    tokens = resp.json()

    from app.models.user import User

    user = db.query(User).filter(User.email == email).first()
    verify_resp = client.post("/api/v1/auth/verify-email", json={"token": user.email_verification_token})
    assert verify_resp.status_code == 200, verify_resp.text

    return tokens["access_token"], user


def create_published_event_with_ticket(client, db, *, organizer_email="organizer@example.com", price="0", registration_mode="public"):
    access, user = register_and_verify(client, db, email=organizer_email, role="organizer")

    event_resp = client.post(
        "/api/v1/events",
        json={
            "title": "Test Conference",
            "category": "conference",
            "event_format": "physical",
            "registration_mode": registration_mode,
            "venue_name": "Test Hall",
            "city": "Lagos",
            "country": "Nigeria",
            "start_at": "2027-01-01T09:00:00Z",
            "end_at": "2027-01-01T17:00:00Z",
            "currency": "NGN",
        },
        headers={"Authorization": f"Bearer {access}"},
    )
    assert event_resp.status_code == 201, event_resp.text
    event = event_resp.json()

    tt_resp = client.post(
        f"/api/v1/events/{event['id']}/ticket-types",
        json={"name": "Standard", "price": price, "capacity": 100},
        headers={"Authorization": f"Bearer {access}"},
    )
    assert tt_resp.status_code == 201, tt_resp.text
    ticket_type = tt_resp.json()

    publish_resp = client.post(f"/api/v1/events/{event['id']}/publish", headers={"Authorization": f"Bearer {access}"})
    assert publish_resp.status_code == 200, publish_resp.text

    return {"organizer_access": access, "organizer": user, "event": publish_resp.json(), "ticket_type": ticket_type}
