import uuid

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.export import Export
from app.repositories.exports import ExportRepository
from app.repositories.users import UserRepository
from app.schemas.exports import ExportCreate, ExportUpdate


class ExportService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = ExportRepository(session)
        self.users = UserRepository(session)
        self.session = session

    async def create_export(self, data: ExportCreate) -> Export:
        if data.requester_id is not None:
            requester = await self.users.get(data.requester_id)
            if requester is None:
                raise AppError(
                    code="requester_not_found",
                    message="Requester was not found.",
                    status_code=status.HTTP_404_NOT_FOUND,
                )
        export = await self.repository.create(data)
        await self.session.commit()
        return export

    async def list_exports(self, requester_id: uuid.UUID | None = None) -> list[Export]:
        return await self.repository.list_for_requester(requester_id)

    async def get_export(self, export_id: uuid.UUID) -> Export:
        export = await self.repository.get(export_id)
        if export is None:
            raise AppError(
                code="export_not_found",
                message="Export was not found.",
                status_code=status.HTTP_404_NOT_FOUND,
            )
        return export

    async def update_export(self, export_id: uuid.UUID, data: ExportUpdate) -> Export:
        export = await self.get_export(export_id)
        updated = await self.repository.update(export, data)
        await self.session.commit()
        return updated
