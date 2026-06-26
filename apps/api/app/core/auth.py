import base64
import hashlib
import hmac
import json
import uuid
from datetime import UTC, datetime, timedelta
from typing import Any

from app.core.config import Settings


class TokenError(Exception):
    pass


def create_access_token(
    *,
    user_id: uuid.UUID,
    role: str,
    settings: Settings,
    expires_delta: timedelta = timedelta(hours=1),
) -> str:
    header = {"alg": "HS256", "typ": "JWT"}
    now = datetime.now(UTC)
    payload = {
        "iss": settings.auth_token_issuer,
        "sub": str(user_id),
        "role": role,
        "iat": int(now.timestamp()),
        "exp": int((now + expires_delta).timestamp()),
    }
    signing_input = ".".join(
        [
            _base64url_json(header),
            _base64url_json(payload),
        ]
    )
    signature = _sign(signing_input, settings.auth_token_secret)
    return f"{signing_input}.{signature}"


def decode_access_token(token: str, settings: Settings) -> dict[str, Any]:
    parts = token.split(".")
    if len(parts) != 3:
        raise TokenError("Token must have three parts.")
    signing_input = ".".join(parts[:2])
    expected_signature = _sign(signing_input, settings.auth_token_secret)
    if not hmac.compare_digest(parts[2], expected_signature):
        raise TokenError("Token signature is invalid.")
    payload = _base64url_decode_json(parts[1])
    if payload.get("iss") != settings.auth_token_issuer:
        raise TokenError("Token issuer is invalid.")
    exp = payload.get("exp")
    if not isinstance(exp, int) or exp < int(datetime.now(UTC).timestamp()):
        raise TokenError("Token is expired.")
    if not payload.get("sub"):
        raise TokenError("Token subject is missing.")
    return payload


def _base64url_json(data: dict[str, Any]) -> str:
    raw = json.dumps(data, separators=(",", ":"), sort_keys=True).encode()
    return base64.urlsafe_b64encode(raw).decode().rstrip("=")


def _base64url_decode_json(data: str) -> dict[str, Any]:
    padded = data + "=" * (-len(data) % 4)
    try:
        decoded = base64.urlsafe_b64decode(padded.encode())
        payload = json.loads(decoded)
    except (ValueError, json.JSONDecodeError) as exc:
        raise TokenError("Token payload is invalid.") from exc
    if not isinstance(payload, dict):
        raise TokenError("Token payload is invalid.")
    return payload


def _sign(signing_input: str, secret: str) -> str:
    digest = hmac.new(secret.encode(), signing_input.encode(), hashlib.sha256).digest()
    return base64.urlsafe_b64encode(digest).decode().rstrip("=")
