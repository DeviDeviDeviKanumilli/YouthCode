from fastapi import APIRouter

from app.api.routes.health import router as health_router
from app.api.routes.identifications import router as identifications_router
from app.api.routes.media import router as media_router
from app.api.routes.observations import router as observations_router
from app.api.routes.species import router as species_router
from app.api.routes.users import router as users_router
from app.core.config import get_settings

settings = get_settings()

api_router = APIRouter()
api_router.include_router(health_router)
api_router.include_router(identifications_router)
api_router.include_router(media_router)
api_router.include_router(observations_router)
api_router.include_router(species_router)
api_router.include_router(users_router)
