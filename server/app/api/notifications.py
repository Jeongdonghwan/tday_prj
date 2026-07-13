"""알림 API — 내 글에 달린 댓글 목록.

서버 경량 원칙:
  - 별도 알림 테이블/쓰기 없음. 기존 comments 에서 파생 조회(인덱스된 post_id/created_at).
  - 읽음(빨간점) 상태는 클라이언트 로컬(마지막 확인 시각)에서 계산 → 서버 상태·폴링 부담 없음.
  - 화면 포커스 시에만 1회 조회.

  GET /notifications  → { items: [...] }  (최근 30건, 최신순)
"""
from flask import Blueprint, g, jsonify
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..auth import login_required
from ..extensions import db
from ..models import Comment, Post
from .serializers import time_ago

bp = Blueprint("notifications", __name__)


@bp.get("/notifications")
@login_required
def list_notifications():
    me = g.user.id
    rows = db.session.execute(
        select(Comment, Post.title)
        .join(Post, Comment.post_id == Post.id)
        .where(Post.user_id == me, Comment.user_id != me, Comment.is_blinded.is_(False))
        .order_by(Comment.created_at.desc())
        .limit(30)
        .options(joinedload(Comment.author))
    ).all()

    items = []
    for c, post_title in rows:
        items.append({
            "id": c.id,
            "type": "comment",
            "post_id": c.post_id,
            "post_title": post_title,
            "actor": c.author.nickname if c.author else "알 수 없음",
            "actor_avatar_no": c.author.avatar() if c.author else 1,
            "snippet": (c.body or "")[:40],
            "created_at": c.created_at.isoformat() if c.created_at else None,
            "time_text": time_ago(c.created_at),
        })
    return jsonify({"items": items})
