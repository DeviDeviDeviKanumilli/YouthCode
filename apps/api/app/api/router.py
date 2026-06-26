from fastapi import APIRouter

from app.api.routes.environmental_context import router as environmental_context_router
from app.api.routes.exports import router as exports_router
from app.api.routes.health import router as health_router
from app.api.routes.identifications import router as identifications_router
from app.api.routes.intelligence_cards import router as intelligence_cards_router
from app.api.routes.media import router as media_router
from app.api.routes.observations import router as observations_router
from app.api.routes.signal_scores import router as signal_scores_router
from app.api.routes.species import router as species_router
from app.api.routes.users import router as users_router
from app.api.routes.verification import router as verification_router
from app.core.config import get_settings

settings = get_settings()

api_router = APIRouter()
api_router.include_router(environmental_context_router)
api_router.include_router(exports_router)
api_router.include_router(health_router)
api_router.include_router(identifications_router)
api_router.include_router(intelligence_cards_router)
api_router.include_router(media_router)
api_router.include_router(observations_router)
api_router.include_router(signal_scores_router)
api_router.include_router(species_router)
api_router.include_router(users_router)
api_router.include_router(verification_router)
