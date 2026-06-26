from typing import Any

from app.jobs.queue import JobQueue


async def identify_observation(payload: dict[str, Any]) -> dict[str, Any]:
    return {"step": "identify_observation", "observation_id": payload.get("observation_id")}


async def enrich_observation(payload: dict[str, Any]) -> dict[str, Any]:
    return {"step": "enrich_observation", "observation_id": payload.get("observation_id")}


async def score_observation(payload: dict[str, Any]) -> dict[str, Any]:
    return {"step": "score_observation", "observation_id": payload.get("observation_id")}


async def refresh_sampling_grid(payload: dict[str, Any]) -> dict[str, Any]:
    return {"step": "refresh_sampling_grid", "region_code": payload.get("region_code")}


async def generate_export(payload: dict[str, Any]) -> dict[str, Any]:
    return {"step": "generate_export", "export_id": payload.get("export_id")}


def register_job_definitions(queue: JobQueue) -> None:
    queue.register("identify_observation", identify_observation)
    queue.register("enrich_observation", enrich_observation)
    queue.register("score_observation", score_observation)
    queue.register("refresh_sampling_grid", refresh_sampling_grid)
    queue.register("generate_export", generate_export)
