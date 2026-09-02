import time
from collections import defaultdict, deque

import redis
from fastapi import HTTPException, Request, status

from app.core.config import settings

try:
    _redis = redis.from_url(settings.REDIS_URL, socket_connect_timeout=1, socket_timeout=1)
    _redis.ping()
except Exception:
    _redis = None

# In-memory fallback so the API still degrades gracefully (single-process
# only) if Redis is unreachable.
_memory_hits: dict[str, deque] = defaultdict(deque)


def _client_key(request: Request, bucket: str) -> str:
    ip = request.client.host if request.client else "unknown"
    return f"ratelimit:{bucket}:{ip}"


def rate_limit(bucket: str, max_requests: int, window_seconds: int):
    """Sliding-window rate limiter. Applied to auth-sensitive endpoints
    (login, register, password reset, webhook) to blunt brute force and
    abuse, per the PRD's security requirements."""

    def dependency(request: Request) -> None:
        if not settings.RATE_LIMIT_ENABLED:
            return
        key = _client_key(request, bucket)
        now = time.time()

        if _redis is not None:
            try:
                pipe = _redis.pipeline()
                pipe.incr(key, 1)
                pipe.expire(key, window_seconds)
                count, _ = pipe.execute()
                if int(count) > max_requests:
                    raise HTTPException(
                        status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests, please try again later."
                    )
                return
            except redis.RedisError:
                pass

        hits = _memory_hits[key]
        while hits and now - hits[0] > window_seconds:
            hits.popleft()
        if len(hits) >= max_requests:
            raise HTTPException(
                status.HTTP_429_TOO_MANY_REQUESTS, detail="Too many requests, please try again later."
            )
        hits.append(now)

    return dependency
