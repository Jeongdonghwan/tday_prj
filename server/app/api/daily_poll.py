"""커뮤니티 A/B 데일리 폴 API (DESIGN_UPDATE §3, 신규).

  GET  /daily-poll/today   활성 폴 + 비율 + 내 선택 + (커플)상대 선택 + 지난 폴 3개
  POST /daily-poll/vote    { side }  계정당 1회, 즉시 결과
"""
from flask import Blueprint, g, jsonify, request
from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError

from ..auth import login_required
from ..extensions import db
from ..models import Couple, DailyPoll, DailyPollVote

bp = Blueprint("daily_poll", __name__)


def _active_poll():
    return db.session.scalar(
        select(DailyPoll)
        .where(DailyPoll.is_active.is_(True))
        .order_by(DailyPoll.scheduled_date.desc(), DailyPoll.id.desc())
    )


def _partner_id(user):
    if not user.couple_id:
        return None
    couple = db.session.get(Couple, user.couple_id)
    if not couple:
        return None
    return couple.user_b if couple.user_a == user.id else couple.user_a


def _counts(poll_id: int) -> dict:
    rows = db.session.execute(
        select(DailyPollVote.side, func.count(DailyPollVote.id))
        .where(DailyPollVote.poll_id == poll_id)
        .group_by(DailyPollVote.side)
    ).all()
    return {side: int(n) for side, n in rows}


def _sides(poll):
    s = [("a", poll.choice_a), ("b", poll.choice_b)]
    if poll.choice_c:
        s.append(("c", poll.choice_c))
    return s


def _poll_dict(poll, user):
    counts = _counts(poll.id)
    total = sum(counts.get(s, 0) for s, _ in _sides(poll))
    choices = [
        {"side": s, "label": label, "count": counts.get(s, 0), "pct": round(counts.get(s, 0) / total * 100) if total else 0}
        for s, label in _sides(poll)
    ]
    my = db.session.scalar(
        select(DailyPollVote.side).where(DailyPollVote.poll_id == poll.id, DailyPollVote.user_id == user.id)
    )
    partner_vote = None
    pid = _partner_id(user)
    if pid and my:  # 둘 다 투표해야 상대 선택 공개
        partner_vote = db.session.scalar(
            select(DailyPollVote.side).where(DailyPollVote.poll_id == poll.id, DailyPollVote.user_id == pid)
        )
    return {"id": poll.id, "question": poll.question, "choices": choices, "total": total, "my_vote": my, "partner_vote": partner_vote}


@bp.get("/daily-poll/today")
@login_required
def today():
    poll = _active_poll()
    data = {"poll": _poll_dict(poll, g.user) if poll else None}

    past = []
    for p in db.session.scalars(
        select(DailyPoll)
        .where(DailyPoll.id != (poll.id if poll else 0))
        .order_by(DailyPoll.scheduled_date.desc(), DailyPoll.id.desc())
        .limit(3)
    ).all():
        counts = _counts(p.id)
        total = sum(counts.values())
        sides = _sides(p)
        top_side, top_label = max(sides, key=lambda sl: counts.get(sl[0], 0)) if total else (sides[0][0], sides[0][1])
        past.append({
            "id": p.id,
            "question": p.question,
            "top_label": top_label,
            "top_pct": round(counts.get(top_side, 0) / total * 100) if total else 0,
        })
    data["past"] = past
    return jsonify(data)


@bp.post("/daily-poll/vote")
@login_required
def vote():
    side = (request.get_json(silent=True) or {}).get("side")
    poll = _active_poll()
    if not poll:
        return jsonify({"error": "no_active_poll"}), 404
    if side not in ("a", "b") and not (side == "c" and poll.choice_c):
        return jsonify({"error": "invalid_side"}), 400

    db.session.add(DailyPollVote(poll_id=poll.id, user_id=g.user.id, side=side))
    try:
        db.session.flush()
    except IntegrityError:
        db.session.rollback()
        return jsonify({"error": "already_voted", "message": "이미 투표했어요."}), 409
    db.session.commit()
    return jsonify({"poll": _poll_dict(poll, g.user)})
