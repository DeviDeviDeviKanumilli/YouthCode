import uuid
from decimal import Decimal, InvalidOperation
from typing import Any, Literal

from sqlalchemy.ext.asyncio import AsyncSession
from starlette import status

from app.core.errors import AppError
from app.models.sampling_grid import SamplingGridCell, SamplingLabel
from app.repositories.sampling_grid import SamplingGridRepository
from app.repositories.species import SpeciesRepository
from app.schemas.forecast import GeoJSONFeature, GeoJSONFeatureCollection

SAMPLING_GAP_LIMIT = 500


class SamplingGapsService:
    def __init__(self, session: AsyncSession) -> None:
        self.repository = SamplingGridRepository(session)
        self.species = SpeciesRepository(session)

    async def list_sampling_gaps(
        self,
        *,
        bbox: str | None,
        region_code: str | None,
        species_id: uuid.UUID | None,
        mode: Literal["public", "research"],
    ) -> GeoJSONFeatureCollection:
        resolved_bbox = self._parse_bbox(bbox) if bbox is not None else None
        if species_id is not None:
            species = await self.species.get(species_id)
            if species is None:
                raise AppError(
                    code="species_not_found",
                    message="Species was not found.",
                    status_code=status.HTTP_404_NOT_FOUND,
                )
        cells = await self.repository.list_cells(
            bbox=resolved_bbox,
            region_code=region_code,
            limit=SAMPLING_GAP_LIMIT + 1,
        )
        limited_cells = cells[:SAMPLING_GAP_LIMIT]
        features = [self._feature_for_cell(cell, mode=mode) for cell in limited_cells]
        return GeoJSONFeatureCollection(
            features=features,
            metadata={
                "bbox": [str(value) for value in resolved_bbox] if resolved_bbox else None,
                "region_code": region_code,
                "species_id": str(species_id) if species_id else None,
                "feature_count": len(features),
                "limit": SAMPLING_GAP_LIMIT,
                "truncated": len(cells) > SAMPLING_GAP_LIMIT,
                "mode": mode,
                "species_scope": (
                    "MVP sampling grid is region-level; species_id is accepted for client context."
                ),
            },
        )

    def _feature_for_cell(
        self,
        cell: SamplingGridCell,
        *,
        mode: Literal["public", "research"],
    ) -> GeoJSONFeature:
        properties: dict[str, Any] = {
            "layer": "sampling_gap_grid",
            "cell_id": str(cell.id),
            "region_code": cell.region_code,
            "sampling_label": cell.sampling_label.value,
            "observation_count": cell.observation_count,
            "explanation": self._explanation(cell.sampling_label),
            "confidence": self._confidence(cell),
            "uncertainty": self._uncertainty(cell),
        }
        if mode == "research":
            properties.update(
                {
                    "verified_count": cell.verified_count,
                    "recent_observation_count": cell.recent_observation_count,
                    "distance_to_road_m": (
                        float(cell.distance_to_road_m)
                        if cell.distance_to_road_m is not None
                        else None
                    ),
                    "distance_to_trail_m": (
                        float(cell.distance_to_trail_m)
                        if cell.distance_to_trail_m is not None
                        else None
                    ),
                    "distance_to_park_m": (
                        float(cell.distance_to_park_m)
                        if cell.distance_to_park_m is not None
                        else None
                    ),
                    "risk_context": cell.risk_context,
                }
            )
        return GeoJSONFeature(
            geometry={
                "type": "Polygon",
                "coordinates": [
                    [
                        [float(cell.min_longitude), float(cell.min_latitude)],
                        [float(cell.max_longitude), float(cell.min_latitude)],
                        [float(cell.max_longitude), float(cell.max_latitude)],
                        [float(cell.min_longitude), float(cell.max_latitude)],
                        [float(cell.min_longitude), float(cell.min_latitude)],
                    ]
                ],
            },
            properties=properties,
        )

    def _parse_bbox(self, bbox: str) -> tuple[Decimal, Decimal, Decimal, Decimal]:
        try:
            parts = [Decimal(part.strip()) for part in bbox.split(",")]
        except (InvalidOperation, ValueError) as exc:
            raise AppError(
                code="invalid_bbox",
                message="bbox must contain min_lon,min_lat,max_lon,max_lat.",
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            ) from exc
        if len(parts) != 4:
            raise AppError(
                code="invalid_bbox",
                message="bbox must contain min_lon,min_lat,max_lon,max_lat.",
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )
        min_lon, min_lat, max_lon, max_lat = parts
        if min_lon >= max_lon or min_lat >= max_lat:
            raise AppError(
                code="invalid_bbox",
                message="bbox minimums must be less than maximums.",
                status_code=status.HTTP_422_UNPROCESSABLE_CONTENT,
            )
        return min_lon, min_lat, max_lon, max_lat

    def _confidence(self, cell: SamplingGridCell) -> str:
        if cell.observation_count >= 5 and cell.verified_count >= 2:
            return "high"
        if cell.observation_count >= 2 or cell.recent_observation_count >= 2:
            return "medium"
        return "low"

    def _uncertainty(self, cell: SamplingGridCell) -> str:
        if cell.observation_count == 0:
            return "No observations are present in this grid cell; absence is not confirmed."
        if cell.sampling_label in {SamplingLabel.road_trail_biased, SamplingLabel.park_biased}:
            return (
                "Observations are clustered near easier access points and may not represent "
                "the full cell."
            )
        return "Sampling label is inferred from available observations and nearby access context."

    def _explanation(self, label: SamplingLabel) -> str:
        explanations = {
            SamplingLabel.well_sampled: (
                "Multiple verified observations from more than one source support this cell."
            ),
            SamplingLabel.moderately_sampled: (
                "Some observations exist, but additional coverage would improve certainty."
            ),
            SamplingLabel.under_sampled: "Very few observations are available for this cell.",
            SamplingLabel.road_trail_biased: (
                "Most observations appear tied to nearby road or trail access."
            ),
            SamplingLabel.park_biased: "Most observations appear tied to nearby park access.",
            SamplingLabel.high_risk_under_sampled: (
                "Sparse observations near road or trail access suggest a priority survey gap."
            ),
            SamplingLabel.needs_structured_survey: (
                "Sparse observations near park access suggest a structured survey is needed."
            ),
            SamplingLabel.likely_false_absence: (
                "No observations are present despite nearby access context."
            ),
        }
        return explanations[label]
