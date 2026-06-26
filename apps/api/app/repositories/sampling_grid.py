from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.sampling_grid import SamplingGridCell


class SamplingGridRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def replace_region(
        self,
        region_code: str,
        cells: list[SamplingGridCell],
    ) -> list[SamplingGridCell]:
        await self.session.execute(
            delete(SamplingGridCell).where(SamplingGridCell.region_code == region_code)
        )
        self.session.add_all(cells)
        await self.session.flush()
        for cell in cells:
            await self.session.refresh(cell)
        return cells

    async def list_for_region(self, region_code: str) -> list[SamplingGridCell]:
        result = await self.session.execute(
            select(SamplingGridCell)
            .where(SamplingGridCell.region_code == region_code)
            .order_by(SamplingGridCell.min_latitude, SamplingGridCell.min_longitude)
        )
        return list(result.scalars().all())
