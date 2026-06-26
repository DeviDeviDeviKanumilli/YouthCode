import uuid

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.signal_score import SignalScore
from app.schemas.signal_scores import SignalScoreCreate


class SignalScoreRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def upsert(self, observation_id: uuid.UUID, data: SignalScoreCreate) -> SignalScore:
        score = await self.get(observation_id)
        if score is None:
            score = SignalScore(observation_id=observation_id, **data.model_dump())
            self.session.add(score)
        else:
            for field, value in data.model_dump().items():
                setattr(score, field, value)
        await self.session.flush()
        await self.session.refresh(score)
        return score

    async def get(self, observation_id: uuid.UUID) -> SignalScore | None:
        return await self.session.get(SignalScore, observation_id)
