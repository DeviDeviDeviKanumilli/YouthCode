import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.verification import VerificationStatus
from app.models.verification_event import VerificationEvent


class VerificationEventRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(
        self,
        *,
        observation_id: uuid.UUID,
        previous_status: VerificationStatus,
        new_status: VerificationStatus,
        reviewer_id: uuid.UUID,
        notes: str | None,
    ) -> VerificationEvent:
        event = VerificationEvent(
            observation_id=observation_id,
            previous_status=previous_status,
            new_status=new_status,
            reviewer_id=reviewer_id,
            notes=notes,
        )
        self.session.add(event)
        await self.session.flush()
        await self.session.refresh(event)
        return event

    async def list_for_observation(self, observation_id: uuid.UUID) -> list[VerificationEvent]:
        result = await self.session.execute(
            select(VerificationEvent)
            .where(VerificationEvent.observation_id == observation_id)
            .order_by(VerificationEvent.created_at.desc())
        )
        return list(result.scalars().all())
