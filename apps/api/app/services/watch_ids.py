import base64
import json
from decimal import Decimal
from typing import Literal, TypedDict


class WatchIDPayload(TypedDict):
    kind: Literal["item", "place"]
    key: str
    lat: str
    lon: str
    radius: str


def encode_watch_id(payload: WatchIDPayload) -> str:
    raw = json.dumps(payload, separators=(",", ":"), sort_keys=True).encode()
    token = base64.urlsafe_b64encode(raw).decode().rstrip("=")
    return f"watch_{token}"


def decode_watch_id(value: str) -> WatchIDPayload | None:
    if not value.startswith("watch_"):
        return None
    token = value.removeprefix("watch_")
    padding = "=" * (-len(token) % 4)
    try:
        decoded = base64.urlsafe_b64decode(f"{token}{padding}".encode())
        payload = json.loads(decoded)
    except (ValueError, json.JSONDecodeError):
        return None
    if not isinstance(payload, dict):
        return None
    if payload.get("kind") not in {"item", "place"}:
        return None
    if not all(isinstance(payload.get(key), str) for key in ["key", "lat", "lon", "radius"]):
        return None
    return WatchIDPayload(
        kind=payload["kind"],
        key=payload["key"],
        lat=payload["lat"],
        lon=payload["lon"],
        radius=payload["radius"],
    )


def bucket_decimal(value: Decimal) -> Decimal:
    return value.quantize(Decimal("0.01"))


def decimal_string(value: Decimal) -> str:
    return format(value.normalize(), "f")
