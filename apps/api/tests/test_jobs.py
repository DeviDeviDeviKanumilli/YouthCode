import pytest

from app.jobs.definitions import register_job_definitions
from app.jobs.queue import InMemoryJobBackend, JobQueue, JobStatus


def build_queue() -> JobQueue:
    queue = JobQueue(InMemoryJobBackend())
    register_job_definitions(queue)
    return queue


@pytest.mark.anyio
async def test_required_jobs_can_be_queued() -> None:
    queue = build_queue()
    job_names = [
        "identify_observation",
        "enrich_observation",
        "score_observation",
        "refresh_sampling_grid",
        "generate_export",
    ]

    records = [await queue.enqueue(name, {"observation_id": "obs-1"}) for name in job_names]

    assert [record.name for record in records] == job_names
    assert all(record.status == JobStatus.queued for record in records)


@pytest.mark.anyio
async def test_worker_runs_next_job() -> None:
    queue = build_queue()
    queued = await queue.enqueue("identify_observation", {"observation_id": "obs-1"})

    completed = await queue.run_next()

    assert completed is not None
    assert completed.id == queued.id
    assert completed.status == JobStatus.complete
    assert completed.result == {
        "step": "identify_observation",
        "observation_id": "obs-1",
    }
    assert completed.started_at is not None
    assert completed.completed_at is not None


@pytest.mark.anyio
async def test_failed_job_records_error() -> None:
    queue = build_queue()

    async def fail(_: dict[str, object]) -> dict[str, object]:
        raise RuntimeError("boom")

    queue.register("fail_job", fail)
    queued = await queue.enqueue("fail_job", {})

    failed = await queue.run_next()

    assert failed is not None
    assert failed.id == queued.id
    assert failed.status == JobStatus.failed
    assert failed.error is not None
    assert "RuntimeError: boom" in failed.error
