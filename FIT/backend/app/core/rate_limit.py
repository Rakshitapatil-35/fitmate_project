"""Sliding-window rate limiter dependency for protecting authentication endpoints."""

import time
from collections import defaultdict, deque
from threading import Lock
from typing import Deque, Dict

from fastapi import Request, status

from app.config import settings
from app.core.exceptions import AppException


class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding-window rate limiter keyed by client IP and route."""

    def __init__(self, max_requests: int, window_seconds: int) -> None:
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self._hits: Dict[str, Deque[float]] = defaultdict(deque)
        self._lock = Lock()

    def reset(self) -> None:
        """Clear all recorded hits (useful in automated tests)."""
        with self._lock:
            self._hits.clear()

    def check(self, key: str) -> None:
        """Record a request for `key` or raise HTTP 429 if limit is exceeded."""
        now = time.monotonic()
        cutoff = now - self.window_seconds
        with self._lock:
            bucket = self._hits[key]
            while bucket and bucket[0] <= cutoff:
                bucket.popleft()
            if len(bucket) >= self.max_requests:
                raise AppException(
                    message=f"Rate limit exceeded. Maximum {self.max_requests} requests per {self.window_seconds}s.",
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    error_code="RATE_LIMIT_EXCEEDED",
                )
            bucket.append(now)


auth_rate_limiter = SlidingWindowRateLimiter(
    max_requests=settings.AUTH_RATE_LIMIT_REQUESTS,
    window_seconds=settings.AUTH_RATE_LIMIT_WINDOW_SECONDS,
)


async def rate_limit_auth(request: Request) -> None:
    """FastAPI dependency enforcing rate limits on authentication endpoints."""
    client_host = request.client.host if request.client else "unknown"
    key = f"{client_host}:{request.url.path}"
    auth_rate_limiter.check(key)
