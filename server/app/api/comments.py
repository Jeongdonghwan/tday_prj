"""댓글 API (스펙 §7, 3단계 구현).

  GET  /posts/{id}/comments
  POST /posts/{id}/comments   { body, parent_id? }
  POST /comments/{id}/like
"""
from flask import Blueprint, g, jsonify, request
from sqlalchemy import select
from sqlalchemy.orm import joinedload

from ..auth import current_user_optional, login_required
from ..extensions import db
from ..models import Block, Comment, CommentLike, Post
from .serializers import comment_dict

bp = Blueprint("comments", __name__)


@bp.get("/posts/<int:post_id>/comments")
def list_comments(post_id: int):
    user = current_user_optional()
    q = (
        select(Comment)
        .where(Comment.post_id == post_id, Comment.is_blinded.is_(False))
        .order_by(Comment.created_at.asc(), Comment.id.asc())
        .options(joinedload(Comment.author))
    )
    # 차단 유저의 댓글 제외 (UGC 차단 enforcement — 글 피드와 동일 정책)
    if user:
        blocked = select(Block.blocked_user_id).where(Block.user_id == user.id)
        q = q.where(Comment.user_id.not_in(blocked))
    rows = db.session.scalars(q).all()

    replies_by_parent: dict[int, list] = {}
    for c in rows:
        if c.parent_id:
            replies_by_parent.setdefault(c.parent_id, []).append(c)

    tops = [c for c in rows if c.parent_id is None]

    # 내가 좋아요한 댓글 표시 (게스트는 빈 집합)
    liked_ids: set[int] = set()
    if user and rows:
        liked_ids = set(
            db.session.scalars(
                select(CommentLike.comment_id).where(
                    CommentLike.user_id == user.id,
                    CommentLike.comment_id.in_([c.id for c in rows]),
                )
            ).all()
        )

    def _with_liked(d: dict) -> dict:
        d["liked"] = d["id"] in liked_ids
        d["replies"] = [_with_liked(r) for r in d["replies"]]
        return d

    items = [_with_liked(comment_dict(c, replies_by_parent.get(c.id, []))) for c in tops]
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
    """댓글 좋아요 토글 — 유저당 1회 (글 공감과 동일 패턴)."""
    comment = db.session.get(Comment, comment_id)
    if not comment:
        return jsonify({"error": "not_found"}), 404

    existing = db.session.scalar(
        select(CommentLike).where(CommentLike.comment_id == comment_id, CommentLike.user_id == g.user.id)
    )
    if existing:
        db.session.delete(existing)
        comment.like_count = max(0, comment.like_count - 1)
        liked = False
    else:
        db.session.add(CommentLike(comment_id=comment_id, user_id=g.user.id))
        comment.like_count += 1
        liked = True
    db.session.commit()
    return jsonify({"like_count": comment.like_count, "liked": liked})
