import time

import redis

from app.core.config import settings

try:
    _redis = redis.from_url(settings.REDIS_URL, socket_connect_timeout=1, socket_timeout=1)
    _redis.ping()
except Exception:
    _redis = None

_memory_blacklist: dict[str, float] = {}


def blacklist_jti(jti: str, exp_timestamp: float) -> None:
    ttl = max(int(exp_timestamp - time.time()), 1)
    if _redis is not None:
        try:
            _redis.setex(f"blacklist:{jti}", ttl, "1")
            return
        except redis.RedisError:
            pass
    _memory_blacklist[jti] = exp_timestamp


def is_blacklisted(jti: str) -> bool:
    if _redis is not None:
        try:
            return _redis.exists(f"blacklist:{jti}") == 1
        except redis.RedisError:
            pass
    exp = _memory_blacklist.get(jti)
    if exp is None:
        return False
    if exp < time.time():
        _memory_blacklist.pop(jti, None)
        return False
    return True
