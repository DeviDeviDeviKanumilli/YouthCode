import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse

from app.core.config import Settings

EXPENSIVE_PATH_PREFIXES = (
    "/forecast",
    "/research/export",
    "/research/exports",
    "/sampling-gaps",
    "/assistant/context/research",
)


class RateLimitMiddleware(BaseHTTPMiddleware):
    def __init__(self, app: Callable[..., Awaitable[None]], settings: Settings) -> None:
        super().__init__(app)
        self.settings = settings
        self.requests: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(
        self,
        request: Request,
        call_next: Callable[[Request], Awaitable[Response]],
    ) -> Response:
        if not self.settings.rate_limit_enabled or not request.url.path.startswith(
            EXPENSIVE_PATH_PREFIXES
        ):
            return await call_next(request)
        key = f"{request.client.host if request.client else 'unknown'}:{request.url.path}"
        now = time.monotonic()
        bucket = self.requests[key]
        while bucket and now - bucket[0] > self.settings.rate_limit_window_seconds:
            bucket.popleft()
        if len(bucket) >= self.settings.rate_limit_requests:
            return JSONResponse(
                status_code=429,
                content={
                    "code": "rate_limit_exceeded",
                    "message": "Too many requests for this endpoint. Try again later.",
                    "details": None,
                },
            )
        bucket.append(now)
        return await call_next(request)
