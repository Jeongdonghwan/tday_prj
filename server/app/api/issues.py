"""오늘의 연애 이슈 API (DESIGN_UPDATE §5, 신규).

  GET  /issues/today          활성 이슈 + 투표결과 + 내 선택 + 댓글수
  GET  /issues/{id}           상세
  POST /issues/{id}/vote      { side a|b }  1회, 409 dup
  GET  /issues/{id}/comments
  POST /issues/{id}/comments  { body, parent_id? }
"""
from flask import Blueprint, g, jsonify, request
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import joinedload

from ..auth import current_user_optional, login_required
from ..extensions import db
from ..models import Issue, IssueComment, IssueVote
from ._lang import resolve_lang
from .serializers import comment_dict

bp = Blueprint("issues", __name__)


def _active_issue(lang: str):
    return db.session.scalar(
        select(Issue)
        .where(Issue.is_active.is_(True), Issue.lang == lang)
        .order_by(Issue.created_at.desc(), Issue.id.desc())
    )


def _poll(issue, user):
    counts = dict(
        db.session.execute(
            select(IssueVote.side, func.count(IssueVote.id))
            .where(IssueVote.issue_id == issue.id)
            .group_by(IssueVote.side)
        ).all()
    )
    a, b = int(counts.get("a", 0)), int(counts.get("b", 0))
    total = a + b
    # 게스트(비로그인)는 내 투표 없음
    my = None if user is None else db.session.scalar(
        select(IssueVote.side).where(IssueVote.issue_id == issue.id, IssueVote.user_id == user.id)
    )
    return {
        "a_label": issue.poll_option_a,
        "b_label": issue.poll_option_b,
        "a_votes": a,
        "b_votes": b,
        "total": total,
        "a_pct": round(a / total * 100) if total else 50,
        "my_vote": my,
    }


def _issue_dict(issue, user, detail=False):
    poll = _poll(issue, user)
    d = {
        "id": issue.id,
        "title": issue.title,
        "summary": issue.summary,
        "source": issue.source,
        "url": issue.url,
        "comment_count": issue.comment_count,
        "poll": poll,
        "my_vote": poll["my_vote"],
    }
    return d


@bp.get("/issues/today")
def today():
    """오늘의 이슈 — 게스트 열람 허용 (투표는 로그인 필요). 언어권별 분리."""
    user = current_user_optional()
    issue = _active_issue(resolve_lang(user))
    return jsonify({"issue": _issue_dict(issue, user) if issue else None})


@bp.get("/issues/archive")
def archive():
    """지난(비활성) 이슈 아카이브 — 날짜·제목·최종 결과·댓글수 (HOME_UPDATE §3). 언어권별 분리."""
    lang = resolve_lang(current_user_optional())
    rows = db.session.scalars(
        select(Issue)
        .where(Issue.is_active.is_(False), Issue.lang == lang)
        .order_by(Issue.created_at.desc())
        .limit(30)
    ).all()
    items = []
    for issue in rows:
        counts = dict(
            db.session.execute(
                select(IssueVote.side, func.count(IssueVote.id))
                .where(IssueVote.issue_id == issue.id)
                .group_by(IssueVote.side)
            ).all()
        )
        a, b = int(counts.get("a", 0)), int(counts.get("b", 0))
        total = a + b
        items.append({
            "id": issue.id,
            "title": issue.title,
            "date": issue.created_at.date().isoformat() if issue.created_at else None,
            "a_label": issue.poll_option_a,
            "b_label": issue.poll_option_b,
            "a_pct": round(a / total * 100) if total else 50,
            "total": total,
            "comment_count": issue.comment_count,
        })
    return jsonify({"items": items})


@bp.get("/issues/<int:issue_id>")
def detail(issue_id: int):
    issue = db.session.get(Issue, issue_id)
    if not issue:
        return jsonify({"error": "not_found"}), 404
    return jsonify({"issue": _issue_dict(issue, current_user_optional(), detail=True)})


@bp.post("/issues/<int:issue_id>/vote")
@login_required
def vote(issue_id: int):
    side = (request.get_json(silent=True) or {}).get("side")
    if side not in ("a", "b"):
        return jsonify({"error": "invalid_side"}), 400
    issue = db.session.get(Issue, issue_id)
    if not issue:
        return jsonify({"error": "not_found"}), 404

    db.session.add(IssueVote(issue_id=issue_id, user_id=g.user.id, side=side))
    try:
        db.session.flush()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "already_voted"}), 409
    db.session.commit()
    return jsonify({"issue": _issue_dict(issue, g.user)})


@bp.get("/issues/<int:issue_id>/comments")
def list_comments(issue_id: int):
    rows = db.session.scalars(
        select(IssueComment)
        .where(IssueComment.issue_id == issue_id, IssueComment.is_blinded.is_(False))
        .order_by(IssueComment.created_at.asc(), IssueComment.id.asc())
        .options(joinedload(IssueComment.author))
    ).all()
    replies: dict[int, list] = {}
    for c in rows:
        if c.parent_id:
            replies.setdefault(c.parent_id, []).append(c)
    tops = [c for c in rows if c.parent_id is None]
    items = [comment_dict(c, replies.get(c.id, [])) for c in tops]
    return jsonify({"items": items, "count": len(rows)})


@bp.post("/issues/<int:issue_id>/comments")
@login_required
def create_comment(issue_id: int):
    data = request.get_json(silent=True) or {}
    body = (data.get("body") or "").strip()
    if not body:
        return jsonify({"error": "body_required"}), 400
    issue = db.session.get(Issue, issue_id)
    if not issue:
        return jsonify({"error": "not_found"}), 404

    comment = IssueComment(
        issue_id=issue_id,
        user_id=g.user.id,
        parent_id=data.get("parent_id"),
        body=body,
        author_status=g.user.relationship_status,
    )
    db.session.add(comment)
    issue.comment_count += 1
    db.session.commit()
    db.session.refresh(comment)
    return jsonify(comment_dict(comment, [])), 201
