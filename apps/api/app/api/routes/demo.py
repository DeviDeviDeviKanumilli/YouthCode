from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_async_session
from app.schemas.demo import DemoScenario, DemoScenarioID, DemoScenarioList
from app.services.demo_scenarios import DemoScenarioService

router = APIRouter(prefix="/demo", tags=["demo"])
SessionDep = Annotated[AsyncSession, Depends(get_async_session)]


@router.get("/scenarios", response_model=DemoScenarioList)
async def list_demo_scenarios(session: SessionDep) -> DemoScenarioList:
    return await DemoScenarioService(session).list_scenarios()


@router.get("/scenarios/{scenario_id}", response_model=DemoScenario)
async def get_demo_scenario(
    scenario_id: DemoScenarioID,
    session: SessionDep,
) -> DemoScenario:
    return await DemoScenarioService(session).get_scenario(scenario_id)
