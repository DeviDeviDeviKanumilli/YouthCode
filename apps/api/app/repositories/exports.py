import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.export import Export
from app.schemas.exports import ExportCreate, ExportUpdate


class ExportRepository:
    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, data: ExportCreate) -> Export:
        export = Export(**data.model_dump())
        self.session.add(export)
        await self.session.flush()
        await self.session.refresh(export)
        return export

    async def get(self, export_id: uuid.UUID) -> Export | None:
        return await self.session.get(Export, export_id)

    async def list_for_requester(self, requester_id: uuid.UUID | None = None) -> list[Export]:
        statement = select(Export).order_by(Export.created_at.desc())
        if requester_id is not None:
            statement = statement.where(Export.requester_id == requester_id)
        result = await self.session.execute(statement)
        return list(result.scalars().all())

    async def update(self, export: Export, data: ExportUpdate) -> Export:
        for field, value in data.model_dump(exclude_unset=True).items():
            setattr(export, field, value)
        await self.session.flush()
        await self.session.refresh(export)
        return export
