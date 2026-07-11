"""댓글 API (스펙 §7, 3단계 구현).

  GET  /posts/{id}/comments
  POST /posts/{id}/comments   { body, parent_id? }
  POST /comments/{id}/like
"""
from flask import Blueprint, g, jsonify, request
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..auth import login_required
from ..extensions import db
from ..models import Comment, Post
from .serializers import comment_dict

bp = Blueprint("comments", __name__)


@bp.get("/posts/<int:post_id>/comments")
def list_comments(post_id: int):
    rows = db.session.scalars(
        select(Comment)
        .where(Comment.post_id == post_id, Comment.is_blinded.is_(False))
        .order_by(Comment.created_at.asc(), Comment.id.asc())
        .options(joinedload(Comment.author))
    ).all()

    replies_by_parent: dict[int, list] = {}
    for c in rows:
        if c.parent_id:
            replies_by_parent.setdefault(c.parent_id, []).append(c)

    tops = [c for c in rows if c.parent_id is None]
    items = [comment_dict(c, replies_by_parent.get(c.id, [])) for c in tops]
    return jsonify({"items": items, "count": len(rows)})


@bp.post("/posts/<int:post_id>/comments")
@login_required
def create_comment(post_id: int):
    data = request.get_json(silent=True) or {}
    body = (data.get("body") or "").strip()
    parent_id = data.get("parent_id")

    if not body:
        return jsonify({"error": "body_required"}), 400

    post = db.session.get(Post, post_id)
    if not post:
        return jsonify({"error": "not_found"}), 404

    if parent_id is not None:
        parent = db.session.get(Comment, parent_id)
        if not parent or parent.post_id != post_id:
            return jsonify({"error": "invalid_parent"}), 400

    comment = Comment(
        post_id=post_id,
        user_id=g.user.id,
        parent_id=parent_id,
        body=body,
        author_status=g.user.relationship_status,  # 작성 시점 스냅샷
    )
    db.session.add(comment)
    post.comment_count += 1
    db.session.commit()
    db.session.refresh(comment)
    return jsonify(comment_dict(comment, [])), 201


@bp.post("/comments/<int:comment_id>/like")
@login_required
def like_comment(comment_id: int):
    comment = db.session.get(Comment, comment_id)
    if not comment:
        return jsonify({"error": "not_found"}), 404
    comment.like_count += 1
    db.session.commit()
    return jsonify({"like_count": comment.like_count})
