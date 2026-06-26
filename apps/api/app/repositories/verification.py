import uuid
from datetime import UTC, datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.verification import Verification, VerificationStatus


class VerificationRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def get(self, observation_id: uuid.UUID) -> Verification | None:
        return await self.session.get(Verification, observation_id)

    async def ensure_raw(self, observation_id: uuid.UUID) -> Verification:
        verification = await self.get(observation_id)
        if verification is None:
            verification = Verification(
                observation_id=observation_id,
                status=VerificationStatus.raw,
            )
            self.session.add(verification)
            await self.session.flush()
            await self.session.refresh(verification)
        return verification

    async def mark_ai_suggested(self, observation_id: uuid.UUID) -> Verification:
        verification = await self.ensure_raw(observation_id)
        if verification.status == VerificationStatus.raw:
            verification.status = VerificationStatus.ai_suggested
            await self.session.flush()
            await self.session.refresh(verification)
        return verification

    async def set_status(
        self,
        observation_id: uuid.UUID,
        *,
        status: VerificationStatus,
        reviewer_id: uuid.UUID,
        reviewer_type: str,
        verified_species_id: uuid.UUID | None,
        review_notes: str | None,
    ) -> Verification:
        verification = await self.ensure_raw(observation_id)
        verification.status = status
        verification.reviewer_id = reviewer_id
        verification.reviewer_type = reviewer_type
        verification.verified_species_id = verified_species_id
        verification.review_notes = review_notes
        verification.reviewed_at = datetime.now(UTC)
        await self.session.flush()
        await self.session.refresh(verification)
        return verification

    async def list_queue(self) -> list[Verification]:
        result = await self.session.execute(
            select(Verification).where(
                Verification.status.in_(
                    [
                        VerificationStatus.raw,
                        VerificationStatus.ai_suggested,
                        VerificationStatus.needs_more_evidence,
                        VerificationStatus.community_supported,
                    ]
                )
            )
        )
        return list(result.scalars().all())
