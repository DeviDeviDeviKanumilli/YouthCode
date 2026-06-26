from app.schemas.watch import GoodPlaceToCheck, WatchItem


class WatchRankingService:
    def rank_watch_items(self, items: list[WatchItem]) -> list[WatchItem]:
        ranked = sorted(
            [item.model_copy(update={"priority": self.clamp(item.priority)}) for item in items],
            key=lambda item: item.priority,
            reverse=True,
        )
        limited: list[WatchItem] = []
        invasive_count = 0
        for item in ranked:
            is_invasive = "Invasive" in item.chips
            if is_invasive and invasive_count >= 2:
                continue
            limited.append(item)
            if is_invasive:
                invasive_count += 1
            if len(limited) == 5:
                break
        return limited

    def rank_good_places(self, places: list[GoodPlaceToCheck]) -> list[GoodPlaceToCheck]:
        return sorted(
            [place.model_copy(update={"priority": self.clamp(place.priority)}) for place in places],
            key=lambda place: place.priority,
            reverse=True,
        )[:4]

    def confidence_label(self, priority: int) -> str:
        if priority >= 75:
            return "high"
        if priority >= 45:
            return "medium"
        return "low"

    def clamp(self, value: int) -> int:
        return max(0, min(100, value))
