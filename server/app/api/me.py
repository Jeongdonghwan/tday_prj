"""내 활동 API — 내가 쓴 글 / 내가 단 댓글.

  GET /me/posts     내 글 (블라인드 제외) 최신순 30
  GET /me/comments  내 댓글 (+ 원글 제목) 최신순 30
"""
from flask import Blueprint, g, jsonify
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..auth import login_required
from ..extensions import db
from ..models import Comment, Post
from .serializers import post_dict, time_ago

bp = Blueprint("me", __name__)


@bp.get("/me/posts")
@login_required
def my_posts():
    rows = db.session.scalars(
        select(Post)
        .where(Post.user_id == g.user.id, Post.is_blinded.is_(False))
        .order_by(Post.id.desc())
        .limit(30)
        .options(joinedload(Post.author), joinedload(Post.options))
    ).unique().all()
    return jsonify({"items": [post_dict(p) for p in rows]})


@bp.get("/me/comments")
@login_required
def my_comments():
    rows = db.session.execute(
        select(Comment, Post.title)
        .join(Post, Comment.post_id == Post.id)
        .where(Comment.user_id == g.user.id, Comment.is_blinded.is_(False))
        .order_by(Comment.created_at.desc())
        .limit(30)
    ).all()
    items = [
        {
            "id": c.id,
            "post_id": c.post_id,
            "post_title": post_title,
            "body": c.body,
            "time_text": time_ago(c.created_at),
            "created_at": c.created_at.isoformat() if c.created_at else None,
        }
        for c, post_title in rows
    ]
    return jsonify({"items": items})
