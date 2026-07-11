"""BEST 랭킹 — hot_score 계산 + 간단 메모리 캐시 (스펙 §8: 실시간 정렬쿼리 금지, 5분 배치)."""
import time
from datetime import datetime

from sqlalchemy import func, select

from .extensions import db
from .models import PollOption, Post


def compute_hot_score(post, vote_total: int, now: datetime) -> float:
    """engagement / 시간감쇠. (likes + 2*comments + 0.5*votes) / (age_h+2)^1.5"""
    age_hours = max((now - post.created_at).total_seconds() / 3600.0, 0)
    engagement = post.like_count + 2 * post.comment_count + 0.5 * float(vote_total)
    return engagement / pow(age_hours + 2, 1.5)


def recompute_hot_scores() -> int:
    """전체 글 hot_score 재계산 (cron/스케줄러가 5분마다 호출). 갱신 건수 반환."""
    now = datetime.utcnow()
    vote_totals = dict(
        db.session.execute(
            select(PollOption.post_id, func.coalesce(func.sum(PollOption.vote_count), 0)).group_by(PollOption.post_id)
        ).all()
    )
    posts = db.session.scalars(select(Post)).all()
    for p in posts:
        p.hot_score = compute_hot_score(p, vote_totals.get(p.id, 0), now)
    db.session.commit()
    return len(posts)


# ---- 아주 단순한 TTL 메모리 캐시 (초기엔 메모리, 트래픽 증가 시 Redis) ----
_cache: dict[str, tuple[float, object]] = {}


def cache_get(key: str, ttl: float):
    hit = _cache.get(key)
    if hit and (time.time() - hit[0]) < ttl:
        return hit[1]
    return None


def cache_set(key: str, value) -> None:
    _cache[key] = (time.time(), value)


def cache_clear() -> None:
    _cache.clear()
