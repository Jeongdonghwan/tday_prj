"""BEST API (스펙 §7, 4단계). hot_score 배치 결과 + 메모리 캐시 사용 (실시간 정렬쿼리 금지).

  GET /best?period=realtime|today|weekly&category=
  GET /best/comments
"""
from datetime import datetime, timedelta

from flask import Blueprint, jsonify, request
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..extensions import db
from ..models import Comment, Post
from ..models.enums import STATUS_LABELS
from ..ranking import cache_get, cache_set
from .serializers import post_dict

bp = Blueprint("best", __name__)

CACHE_TTL = 60  # 초


@bp.get("/best")
def best_posts():
    period = request.args.get("period", "realtime")
    category = request.args.get("category")
    cache_key = f"best:{period}:{category or 'all'}"

    cached = cache_get(cache_key, CACHE_TTL)
    if cached is not None:
        return jsonify(cached)

    q = select(Post).where(Post.is_blinded.is_(False))
    if category and category != "all":
        q = q.where(Post.category == category)

    if period == "realtime":
        q = q.order_by(Post.hot_score.desc(), Post.id.desc())
    else:
        # today / weekly: 기간 내 engagement 순
        since = datetime.utcnow() - (timedelta(days=1) if period == "today" else timedelta(days=7))
        q = q.where(Post.created_at >= since).order_by(
            (Post.like_count + Post.comment_count).desc(), Post.id.desc()
        )

    q = q.limit(20).options(joinedload(Post.author), joinedload(Post.options))
    rows = db.session.scalars(q).unique().all()
    payload = {"items": [post_dict(p) for p in rows]}
    cache_set(cache_key, payload)
    return jsonify(payload)


@bp.get("/best/comments")
def best_comments():
    cache_key = "best:comments"
    cached = cache_get(cache_key, CACHE_TTL)
    if cached is not None:
        return jsonify(cached)

    rows = db.session.scalars(
        select(Comment)
        .where(Comment.is_blinded.is_(False))
        .order_by(Comment.like_count.desc(), Comment.id.desc())
        .limit(20)
        .options(joinedload(Comment.author))
    ).all()

    # 댓글이 달린 글 제목 매핑
    post_ids = {c.post_id for c in rows}
    titles = dict(db.session.execute(select(Post.id, Post.title).where(Post.id.in_(post_ids))).all()) if post_ids else {}

    items = [
        {
            "id": c.id,
            "body": c.body,
            "like_count": c.like_count,
            "post_id": c.post_id,
            "post_title": titles.get(c.post_id, ""),
            "author": {
                "nickname": c.author.nickname if c.author else "알 수 없음",
                "status": c.author_status,
                "status_label": STATUS_LABELS.get(c.author_status, ""),
            },
        }
        for c in rows
    ]
    payload = {"items": items}
    cache_set(cache_key, payload)
    return jsonify(payload)
