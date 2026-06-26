from decimal import Decimal

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

    async def list_cells(
        self,
        *,
        bbox: tuple[Decimal, Decimal, Decimal, Decimal] | None = None,
        region_code: str | None = None,
        limit: int = 500,
    ) -> list[SamplingGridCell]:
        statement = select(SamplingGridCell)
        if region_code is not None:
            statement = statement.where(SamplingGridCell.region_code == region_code)
        if bbox is not None:
            min_lon, min_lat, max_lon, max_lat = bbox
            statement = statement.where(
                SamplingGridCell.max_longitude >= min_lon,
                SamplingGridCell.min_longitude <= max_lon,
                SamplingGridCell.max_latitude >= min_lat,
                SamplingGridCell.min_latitude <= max_lat,
            )
        result = await self.session.execute(
            statement.order_by(
                SamplingGridCell.region_code,
                SamplingGridCell.min_latitude,
                SamplingGridCell.min_longitude,
            ).limit(limit)
        )
        return list(result.scalars().all())

    async def find_cell_for_point(
        self,
        *,
        latitude: Decimal,
        longitude: Decimal,
        region_code: str | None,
    ) -> SamplingGridCell | None:
        statement = select(SamplingGridCell).where(
            SamplingGridCell.min_longitude <= longitude,
            SamplingGridCell.max_longitude >= longitude,
            SamplingGridCell.min_latitude <= latitude,
            SamplingGridCell.max_latitude >= latitude,
        )
        if region_code is not None:
            statement = statement.where(SamplingGridCell.region_code == region_code)
        result = await self.session.execute(
            statement.order_by(
                SamplingGridCell.region_code,
                SamplingGridCell.min_latitude,
                SamplingGridCell.min_longitude,
            ).limit(1)
        )
        return result.scalar_one_or_none()
