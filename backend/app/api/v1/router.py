from fastapi import APIRouter

from app.api.v1.auth import router as auth_router
from app.api.v1.checkins import router as checkins_router
from app.api.v1.dev import router as dev_router
from app.api.v1.events import router as events_router
from app.api.v1.invitations import router as invitations_router
from app.api.v1.payments import router as payments_router
from app.api.v1.registrations import router as registrations_router
from app.api.v1.seating import router as seating_router
from app.api.v1.staff import router as staff_router
from app.api.v1.tickets import router as tickets_router

api_router = APIRouter()
api_router.include_router(auth_router)
api_router.include_router(dev_router)
api_router.include_router(events_router)
api_router.include_router(registrations_router)
api_router.include_router(payments_router)
api_router.include_router(tickets_router)
api_router.include_router(seating_router)
api_router.include_router(invitations_router)
api_router.include_router(staff_router)
api_router.include_router(checkins_router)
