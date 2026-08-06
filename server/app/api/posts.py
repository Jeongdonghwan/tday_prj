"""오늘연애 글/투표 API (스펙 §7, 3단계 구현).

  GET    /posts?category=&cursor=&limit=
  POST   /posts
  GET    /posts/{id}
  DELETE /posts/{id}
  POST   /posts/{id}/vote   { side }   (중복 409)
  POST   /posts/{id}/like
"""
from flask import Blueprint, g, jsonify, request
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from ..auth import current_user_optional, login_required
from ..extensions import db
from ..models import Block, Comment, PollOption, Post, PostLike, Vote
from ..models.enums import POLL_SIDES, POST_CATEGORIES
from ._lang import resolve_lang
from .serializers import post_dict

bp = Blueprint("posts", __name__)


@bp.get("/posts")
def list_posts():
    """커서 페이지네이션(id DESC = 최신순, OFFSET 금지). 차단 유저 글 제외."""
    user = current_user_optional()
    category = request.args.get("category")
    post_type = request.args.get("post_type")  # 'kstory' 면 K-Story 모아보기
    cursor = request.args.get("cursor", type=int)
    limit = min(request.args.get("limit", default=20, type=int), 50)
    search = (request.args.get("q") or "").strip()

    q = select(Post).where(Post.is_blinded.is_(False))
    # 언어권 격리 — 유저(게스트는 Accept-Language)의 lang 피드만 노출
    q = q.where(Post.lang == resolve_lang(user))
    if post_type in ("user", "kstory"):
        q = q.where(Post.post_type == post_type)
    if category and category != "all":
        q = q.where(Post.category == category)
    else:
        # 텍스트 피드/전체에서는 인증·사진(photo) 게시판 글 제외 (앨범 전용)
        q = q.where(Post.category != "photo")
    if search:
        like = f"%{search}%"
        q = q.where(Post.title.ilike(like) | Post.body.ilike(like))
    if cursor:
        q = q.where(Post.id < cursor)
    if user:
        blocked = select(Block.blocked_user_id).where(Block.user_id == user.id)
        q = q.where(Post.user_id.not_in(blocked))
    q = q.order_by(Post.id.desc()).limit(limit + 1)
    q = q.options(joinedload(Post.author), joinedload(Post.options))

    rows = db.session.scalars(q).unique().all()
    has_more = len(rows) > limit
    rows = rows[:limit]

    my_votes: dict[int, str] = {}
    if user and rows:
        ids = [p.id for p in rows]
        for pid, side in db.session.execute(
            select(Vote.post_id, Vote.option_side).where(Vote.user_id == user.id, Vote.post_id.in_(ids))
        ).all():
            my_votes[pid] = side

    items = [post_dict(p, my_votes.get(p.id)) for p in rows]
    next_cursor = rows[-1].id if (has_more and rows) else None
    return jsonify({"items": items, "next_cursor": next_cursor})


@bp.post("/posts")
@login_required
def create_post():
    data = request.get_json(silent=True) or {}
    category = data.get("category")
    title = (data.get("title") or "").strip()
    body = (data.get("body") or "").strip() or None
    is_poll = bool(data.get("is_poll"))
    image_url = (data.get("image_url") or "").strip() or None

    if category not in POST_CATEGORIES:
        return jsonify({"error": "invalid_category"}), 400
    if not title:
        return jsonify({"error": "title_required"}), 400
    if category == "photo" and not image_url:
        return jsonify({"error": "image_required"}), 400

    post = Post(
        user_id=g.user.id,
        category=category,
        title=title,
        body=body,
        is_poll=is_poll,
        image_url=image_url,
        author_status=g.user.relationship_status,  # 작성 시점 스냅샷
        lang=g.user.lang,  # 작성자 언어권 스냅샷 (피드 격리)
    )
    db.session.add(post)
    db.session.flush()

    if is_poll:
        poll = data.get("poll") or {}
        a_label = (poll.get("a") or "").strip()
        b_label = (poll.get("b") or "").strip()
        if not a_label or not b_label:
            db.session.rollback()
            return jsonify({"error": "poll_options_required", "message": "투표는 A/B 선택지를 모두 입력해야 해요."}), 400
        db.session.add(PollOption(post_id=post.id, side="A", label=a_label))
        db.session.add(PollOption(post_id=post.id, side="B", label=b_label))

    db.session.commit()
    db.session.refresh(post)
    return jsonify(post_dict(post, None)), 201


@bp.get("/posts/<int:post_id>")
def get_post(post_id: int):
    user = current_user_optional()
    post = db.session.get(Post, post_id)
    if not post or post.is_blinded:
        return jsonify({"error": "not_found"}), 404

    post.view_count += 1
    db.session.commit()

    my_vote = None
    liked = False
    if user:
        my_vote = db.session.scalar(
            select(Vote.option_side).where(Vote.post_id == post_id, Vote.user_id == user.id)
        )
        liked = db.session.scalar(
            select(PostLike.id).where(PostLike.post_id == post_id, PostLike.user_id == user.id)
        ) is not None
    return jsonify(post_dict(post, my_vote, liked))


@bp.patch("/posts/<int:post_id>")
@login_required
def update_post(post_id: int):
    """내 글 수정 — 제목/본문/카테고리만. 투표 선택지는 공정성 위해 수정 불가."""
    post = db.session.get(Post, post_id)
    if not post:
        return jsonify({"error": "not_found"}), 404
    if post.user_id != g.user.id:
        return jsonify({"error": "forbidden"}), 403

    data = request.get_json(silent=True) or {}
    if "title" in data:
        title = (data.get("title") or "").strip()
        if not title:
            return jsonify({"error": "title_required"}), 400
        post.title = title
    if "body" in data:
        post.body = (data.get("body") or "").strip() or None
    if "category" in data:
        category = data.get("category")
        if category not in POST_CATEGORIES:
            return jsonify({"error": "invalid_category"}), 400
        post.category = category

    db.session.commit()
    my_vote = db.session.scalar(
        select(Vote.option_side).where(Vote.post_id == post_id, Vote.user_id == g.user.id)
    )
    return jsonify(post_dict(post, my_vote))


@bp.delete("/posts/<int:post_id>")
@login_required
def delete_post(post_id: int):
    post = db.session.get(Post, post_id)
    if not post:
        return jsonify({"error": "not_found"}), 404
    if post.user_id != g.user.id:
        return jsonify({"error": "forbidden"}), 403

    # 원본 삭제 시 연결된 K-Story 발행글 자동 비공개 (약관 §2차활용 철회 대응)
    if post.lang == "ko":
        from ..services.kstory import unpublish_for_source

        unpublish_for_source(post_id)

    # FK 정리 후 글 삭제 (poll_options 는 relationship cascade)
    db.session.execute(delete(Vote).where(Vote.post_id == post_id))
    db.session.execute(delete(Comment).where(Comment.post_id == post_id))
    db.session.delete(post)
    db.session.commit()
    return jsonify({"ok": True})


@bp.post("/posts/<int:post_id>/vote")
@login_required
def vote(post_id: int):
    side = (request.get_json(silent=True) or {}).get("side")
    if side not in POLL_SIDES:
        return jsonify({"error": "invalid_side"}), 400

    post = db.session.get(Post, post_id)
    if not post:
        return jsonify({"error": "not_found"}), 404
    if not post.is_poll:
        return jsonify({"error": "not_a_poll"}), 400

    db.session.add(Vote(post_id=post_id, user_id=g.user.id, option_side=side))
    try:
        db.session.flush()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "already_voted", "message": "이미 투표했어요."}), 409

    opt = db.session.scalar(
        select(PollOption).where(PollOption.post_id == post_id, PollOption.side == side)
    )
    if opt:
        opt.vote_count += 1
    db.session.commit()
    db.session.refresh(post)
    return jsonify(post_dict(post, side))


@bp.post("/posts/<int:post_id>/like")
@login_required
def like_post(post_id: int):
    """공감 토글 — 유저당 1회. 이미 눌렀으면 해제(-1), 아니면 공감(+1)."""
    post = db.session.get(Post, post_id)
    if not post:
        return jsonify({"error": "not_found"}), 404

    existing = db.session.scalar(
        select(PostLike).where(PostLike.post_id == post_id, PostLike.user_id == g.user.id)
    )
    if existing:
        db.session.delete(existing)
        post.like_count = max(0, post.like_count - 1)
        liked = False
    else:
        db.session.add(PostLike(post_id=post_id, user_id=g.user.id))
        post.like_count += 1
        liked = True
    try:
        db.session.commit()
    except IntegrityError:  # 동시 중복 방지
        db.session.rollback()
        liked = True
    return jsonify({"like_count": post.like_count, "liked": liked})
