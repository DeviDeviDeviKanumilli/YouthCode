import json
import traceback
import uuid
from collections import deque
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from enum import StrEnum
from typing import Any

from redis.asyncio import Redis


class JobStatus(StrEnum):
    queued = "queued"
    running = "running"
    complete = "complete"
    failed = "failed"


@dataclass
class JobRecord:
    id: uuid.UUID
    name: str
    payload: dict[str, Any]
    status: JobStatus = JobStatus.queued
    result: dict[str, Any] | None = None
    error: str | None = None
    queued_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    started_at: datetime | None = None
    completed_at: datetime | None = None


JobHandler = Callable[[dict[str, Any]], Awaitable[dict[str, Any]]]


class InMemoryJobBackend:
    def __init__(self) -> None:
        self.records: dict[uuid.UUID, JobRecord] = {}
        self.queue: deque[uuid.UUID] = deque()

    async def enqueue(self, record: JobRecord) -> JobRecord:
        self.records[record.id] = record
        self.queue.append(record.id)
        return record

    async def dequeue(self) -> JobRecord | None:
        if not self.queue:
            return None
        return self.records[self.queue.popleft()]

    async def save(self, record: JobRecord) -> None:
        self.records[record.id] = record

    async def get(self, job_id: uuid.UUID) -> JobRecord | None:
        return self.records.get(job_id)


class RedisJobBackend:
    def __init__(self, redis: Redis, queue_name: str = "ecosentinel:jobs") -> None:
        self.redis = redis
        self.queue_name = queue_name

    async def enqueue(self, record: JobRecord) -> JobRecord:
        await self.save(record)
        await self.redis.rpush(self.queue_name, str(record.id))
        return record

    async def dequeue(self) -> JobRecord | None:
        job_id = await self.redis.lpop(self.queue_name)
        if job_id is None:
            return None
        decoded = job_id.decode() if isinstance(job_id, bytes) else str(job_id)
        return await self.get(uuid.UUID(decoded))

    async def save(self, record: JobRecord) -> None:
        await self.redis.set(self._record_key(record.id), json.dumps(self._serialize(record)))

    async def get(self, job_id: uuid.UUID) -> JobRecord | None:
        data = await self.redis.get(self._record_key(job_id))
        if data is None:
            return None
        decoded = data.decode() if isinstance(data, bytes) else str(data)
        return self._deserialize(json.loads(decoded))

    def _record_key(self, job_id: uuid.UUID) -> str:
        return f"{self.queue_name}:records:{job_id}"

    def _serialize(self, record: JobRecord) -> dict[str, Any]:
        return {
            "id": str(record.id),
            "name": record.name,
            "payload": record.payload,
            "status": record.status.value,
            "result": record.result,
            "error": record.error,
            "queued_at": record.queued_at.isoformat(),
            "started_at": record.started_at.isoformat() if record.started_at else None,
            "completed_at": record.completed_at.isoformat() if record.completed_at else None,
        }

    def _deserialize(self, data: dict[str, Any]) -> JobRecord:
        return JobRecord(
            id=uuid.UUID(data["id"]),
            name=data["name"],
            payload=data["payload"],
            status=JobStatus(data["status"]),
            result=data["result"],
            error=data["error"],
            queued_at=datetime.fromisoformat(data["queued_at"]),
            started_at=(
                datetime.fromisoformat(data["started_at"]) if data["started_at"] else None
            ),
            completed_at=(
                datetime.fromisoformat(data["completed_at"]) if data["completed_at"] else None
            ),
        )


class JobQueue:
    def __init__(self, backend: InMemoryJobBackend | RedisJobBackend) -> None:
        self.backend = backend
        self.handlers: dict[str, JobHandler] = {}

    def register(self, name: str, handler: JobHandler) -> None:
        self.handlers[name] = handler

    async def enqueue(self, name: str, payload: dict[str, Any]) -> JobRecord:
        if name not in self.handlers:
            raise ValueError(f"Unknown job: {name}")
        record = JobRecord(id=uuid.uuid4(), name=name, payload=payload)
        return await self.backend.enqueue(record)

    async def run_next(self) -> JobRecord | None:
        record = await self.backend.dequeue()
        if record is None:
            return None
        handler = self.handlers[record.name]
        record.status = JobStatus.running
        record.started_at = datetime.now(UTC)
        await self.backend.save(record)
        try:
            record.result = await handler(record.payload)
            record.status = JobStatus.complete
        except Exception as exc:  # noqa: BLE001 - worker must capture job failures.
            record.status = JobStatus.failed
            record.error = "".join(traceback.format_exception_only(type(exc), exc)).strip()
        record.completed_at = datetime.now(UTC)
        await self.backend.save(record)
        return record
