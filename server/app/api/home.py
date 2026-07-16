"""홈 API (HOME_UPDATE §2). 인기글 TOP5.

  GET /home/trending  최근24h 가중치(조회×1+댓글×5+공감×3) 상위 5 (10분 캐시)
"""
from datetime import datetime, timedelta

from flask import Blueprint, jsonify
from sqlalchemy import select

from ..extensions import db
from ..models import Post
from ..ranking import cache_get, cache_set

bp = Blueprint("home", __name__)

_CACHE_KEY = "home:trending"
_TTL = 600  # 10분 (매 요청 계산 금지)


def _weight(p: Post) -> int:
    return p.view_count * 1 + p.comment_count * 5 + p.like_count * 3


@bp.get("/home/trending")
def trending():
    """실시간 인기 — 게스트 열람 허용."""
    cached = cache_get(_CACHE_KEY, _TTL)
    if cached is not None:
        return jsonify(cached)

    since = datetime.utcnow() - timedelta(hours=24)
    rows = db.session.scalars(
        select(Post).where(Post.is_blinded.is_(False), Post.created_at >= since)
    ).all()
    top = sorted(rows, key=_weight, reverse=True)[:5]
    payload = {"items": [{"id": p.id, "title": p.title, "comment_count": p.comment_count} for p in top]}
    cache_set(_CACHE_KEY, payload)
    return jsonify(payload)
