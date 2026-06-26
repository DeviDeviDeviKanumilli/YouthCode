from datetime import UTC, datetime, timedelta
from typing import Literal

from sqlalchemy.ext.asyncio import AsyncSession

from app.models.identification import AIIdentification
from app.models.observation import Observation
from app.models.sampling_grid import SamplingLabel
from app.models.signal_score import SignalScoreLabel
from app.repositories.identifications import IdentificationRepository
from app.repositories.signal_scores import SignalScoreRepository
from app.repositories.static_geo_layers import StaticGeoLayerRepository
from app.schemas.watch import WatchAction, WatchEvidence, WatchItem
from app.services.local_context_service import LocalWatchContext
from app.services.species_profile_service import SpeciesWatchProfileBundle
from app.services.watch_copy_service import WatchCopyService
from app.services.watch_ids import decimal_string, encode_watch_id
from app.services.watch_ranking_service import WatchRankingService


class WatchedSpeciesService:
    def __init__(self, session: AsyncSession) -> None:
        self.identifications = IdentificationRepository(session)
        self.signal_scores = SignalScoreRepository(session)
        self.static_layers = StaticGeoLayerRepository(session)
        self.copy = WatchCopyService()
        self.ranking = WatchRankingService()

    async def generate(
        self,
        *,
        context: LocalWatchContext,
        profiles: list[SpeciesWatchProfileBundle],
        now: datetime | None = None,
    ) -> list[WatchItem]:
        now = now or datetime.now(UTC)
        items = [
            item
            for item in [
                await self._item_for_profile(context=context, bundle=bundle, now=now)
                for bundle in profiles
            ]
            if item is not None
        ]
        return self.ranking.rank_watch_items(items)

    async def _item_for_profile(
        self,
        *,
        context: LocalWatchContext,
        bundle: SpeciesWatchProfileBundle,
        now: datetime,
    ) -> WatchItem | None:
        matching_observations = await self._matching_observations(context, bundle)
        recent_observations = [
            observation
            for observation, _identification in matching_observations
            if self._aware(observation.timestamp) >= now - timedelta(days=30)
        ]
        nearest_observation_m = self._nearest_observation_m(context, recent_observations)
        known_records = await self.static_layers.nearby_known_records(
            context.latitude,
            context.longitude,
            radius_m=context.radius_m,
            species_id=bundle.species.id,
            limit=25,
        )
        current_month_relevant = not bundle.profile.active_months or (
            context.current_month in bundle.profile.active_months
        )
        habitat_matches = self._habitat_matches(context, bundle)
        high_signal_count = await self._high_signal_count(matching_observations)
        sampling_gap = any(
            cell.sampling_label
            in {
                SamplingLabel.under_sampled,
                SamplingLabel.high_risk_under_sampled,
                SamplingLabel.needs_structured_survey,
                SamplingLabel.likely_false_absence,
            }
            for cell in context.sampling_cells
        )
        should_generate = any(
            [
                recent_observations,
                known_records,
                habitat_matches,
                high_signal_count > 0,
                sampling_gap and bundle.profile.is_invasive_concern,
            ]
        )
        if not should_generate:
            return None
        priority = self._priority(
            bundle=bundle,
            recent_count=len(recent_observations),
            nearest_observation_m=nearest_observation_m,
            current_month_relevant=current_month_relevant,
            habitat_matches=habitat_matches,
            known_record_count=len(known_records),
            high_signal_count=high_signal_count,
            sampling_gap=sampling_gap,
        )
        chips = self._chips(bundle, recent_observations, current_month_relevant, habitat_matches)
        return WatchItem(
            id=encode_watch_id(
                {
                    "kind": "item",
                    "key": bundle.key,
                    "lat": decimal_string(context.latitude),
                    "lon": decimal_string(context.longitude),
                    "radius": decimal_string(context.radius_km),
                }
            ),
            type=self._item_type(bundle, current_month_relevant),
            label=bundle.profile.watch_label,
            title=bundle.species.common_name or bundle.species.scientific_name,
            summary=self.copy.species_summary(
                bundle,
                recent_count=len(recent_observations),
                nearest_meters=nearest_observation_m,
                known_record_count=len(known_records),
                habitat_matches=habitat_matches,
            ),
            chips=chips,
            species_id=bundle.species.id,
            priority=priority,
            confidence_label=self._confidence_label(priority),
            evidence=WatchEvidence(
                recent_observation_count=len(recent_observations),
                nearest_observation_meters=nearest_observation_m,
                nearby_known_record_count=len(known_records),
                current_month_relevant=current_month_relevant,
                habitat_matches=habitat_matches,
                source_names=self._sources(recent_observations, known_records, habitat_matches),
            ),
            image_url=bundle.asset.image_url if bundle.asset else None,
            image_alt=bundle.asset.alt_text if bundle.asset else None,
            next_action=WatchAction(
                label="Report if you see this",
                type="start_report_with_species",
            ),
        )

    async def _matching_observations(
        self,
        context: LocalWatchContext,
        bundle: SpeciesWatchProfileBundle,
    ) -> list[tuple[Observation, AIIdentification]]:
        matches: list[tuple[Observation, AIIdentification]] = []
        for observation in context.observations:
            identifications = await self.identifications.list_for_observation(observation.id)
            latest = identifications[0] if identifications else None
            if latest is not None and latest.candidate_species_id == bundle.species.id:
                matches.append((observation, latest))
        return matches

    async def _high_signal_count(
        self,
        observations: list[tuple[Observation, AIIdentification]],
    ) -> int:
        count = 0
        for observation, _identification in observations:
            score = await self.signal_scores.get(observation.id)
            if score and score.label in {
                SignalScoreLabel.high_value_verification_candidate,
                SignalScoreLabel.priority_ecological_signal,
            }:
                count += 1
        return count

    def _nearest_observation_m(
        self,
        context: LocalWatchContext,
        observations: list[Observation],
    ) -> int | None:
        if not observations:
            return None
        nearest = min(
            self.static_layers.distance_m(
                context.latitude,
                context.longitude,
                observation.latitude,
                observation.longitude,
            )
            for observation in observations
        )
        return int(nearest)

    def _habitat_matches(
        self,
        context: LocalWatchContext,
        bundle: SpeciesWatchProfileBundle,
    ) -> list[str]:
        matches: list[str] = []
        tags = set(bundle.profile.habitat_tags + bundle.profile.pathway_tags)
        if context.waterways and tags.intersection({"water", "creek", "wetland", "aquatic"}):
            matches.append("water")
        if context.roads_trails and tags.intersection({"road", "trail", "pathway", "edge"}):
            matches.append("trails")
        if context.parks and tags.intersection({"park", "edge", "tree"}):
            matches.append("parks")
        if bundle.profile.is_tree_pest and context.roads_trails:
            matches.append("street trees")
        return sorted(set(matches))

    def _priority(
        self,
        *,
        bundle: SpeciesWatchProfileBundle,
        recent_count: int,
        nearest_observation_m: int | None,
        current_month_relevant: bool,
        habitat_matches: list[str],
        known_record_count: int,
        high_signal_count: int,
        sampling_gap: bool,
    ) -> int:
        priority = int(bundle.profile.priority_base)
        priority += min(20, recent_count * 10)
        if nearest_observation_m is not None:
            priority += max(0, 15 - int(nearest_observation_m / 500))
        priority += 10 if current_month_relevant and bundle.profile.is_seasonal else 0
        priority += 8 if bundle.profile.is_invasive_concern else 0
        priority += min(12, len(habitat_matches) * 6)
        priority += min(10, known_record_count * 3)
        priority += min(12, high_signal_count * 6)
        priority += 8 if sampling_gap else 0
        if not any([recent_count, known_record_count, habitat_matches, high_signal_count]):
            priority -= 20
        return self.ranking.clamp(priority)

    def _chips(
        self,
        bundle: SpeciesWatchProfileBundle,
        recent_observations: list[Observation],
        current_month_relevant: bool,
        habitat_matches: list[str],
    ) -> list[str]:
        chips: list[str] = []
        if bundle.profile.is_invasive_concern:
            chips.append("Invasive")
        if recent_observations:
            chips.append("Recent")
        if current_month_relevant and bundle.profile.is_seasonal:
            chips.append("Seasonal")
        if bundle.profile.is_tree_pest:
            chips.append("Tree health")
        if bundle.profile.is_aquatic:
            chips.append("Aquatic")
        if habitat_matches:
            chips.append("Habitat match")
        chips.append("Clear photos help")
        return chips[:5]

    def _item_type(
        self,
        bundle: SpeciesWatchProfileBundle,
        current_month_relevant: bool,
    ) -> Literal[
        "species_watch",
        "seasonal_watch",
        "habitat_watch",
        "tree_health",
        "aquatic_watch",
    ]:
        if bundle.profile.is_tree_pest:
            return "tree_health"
        if bundle.profile.is_aquatic:
            return "aquatic_watch"
        if bundle.profile.is_seasonal and current_month_relevant:
            return "seasonal_watch"
        return "species_watch"

    def _confidence_label(self, priority: int) -> Literal["low", "medium", "high"]:
        if priority >= 75:
            return "high"
        if priority >= 45:
            return "medium"
        return "low"

    def _aware(self, value: datetime) -> datetime:
        if value.tzinfo is None:
            return value.replace(tzinfo=UTC)
        return value

    def _sources(
        self,
        recent_observations: list[Observation],
        known_records: object,
        habitat_matches: list[str],
    ) -> list[str]:
        sources = ["species_watch_profiles"]
        if recent_observations:
            sources.append("observations")
        if known_records:
            sources.append("known_records")
        if habitat_matches:
            sources.append("static_geo_layers")
        return sources
