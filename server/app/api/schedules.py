"""공유 캘린더 API (스펙 §7, 6단계).

  GET    /schedules?month=YYYY-MM
  POST   /schedules            { owner, title, event_date, event_time? }
  DELETE /schedules/{id}
"""
from datetime import date, datetime, time

from flask import Blueprint, g, jsonify, request
from sqlalchemy import select

from ..auth import login_required
from ..extensions import db
from ..models import Schedule
from ..models.enums import SCHEDULE_OWNERS

bp = Blueprint("schedules", __name__)


def _scope():
    """커플 연결 시 공유(couple) 스코프, 미연결 시 개인(user) 스코프."""
    if g.user.couple_id:
        return Schedule.couple_id == g.user.couple_id
    return (Schedule.user_id == g.user.id) & (Schedule.couple_id.is_(None))


def _month_range(month_str: str | None):
    if month_str:
        try:
            y, m = (int(x) for x in month_str.split("-"))
            first = date(y, m, 1)
        except (ValueError, TypeError):
            first = date.today().replace(day=1)
    else:
        first = date.today().replace(day=1)
    nxt = date(first.year + 1, 1, 1) if first.month == 12 else date(first.year, first.month + 1, 1)
    return first, nxt


def _to_dict(s: Schedule) -> dict:
    return {
        "id": s.id,
        "owner": s.owner,
        "title": s.title,
        "event_date": s.event_date.isoformat(),
        "event_time": s.event_time.strftime("%H:%M") if s.event_time else None,
    }


@bp.get("/schedules")
@login_required
def list_schedules():
    first, nxt = _month_range(request.args.get("month"))
    rows = db.session.scalars(
        select(Schedule)
        .where(_scope(), Schedule.event_date >= first, Schedule.event_date < nxt)
        .order_by(Schedule.event_date.asc(), Schedule.event_time.asc())
    ).all()
    return jsonify({"items": [_to_dict(s) for s in rows]})


@bp.post("/schedules")
@login_required
def create_schedule():
    data = request.get_json(silent=True) or {}
    owner = data.get("owner", "both")
    title = (data.get("title") or "").strip()
    if owner not in SCHEDULE_OWNERS:
        return jsonify({"error": "invalid_owner"}), 400
    if not title:
        return jsonify({"error": "title_required"}), 400
    try:
        event_date = date.fromisoformat(data["event_date"])
    except (KeyError, TypeError, ValueError):
        return jsonify({"error": "invalid_date"}), 400
    event_time = None
    if data.get("event_time"):
        try:
            event_time = time.fromisoformat(data["event_time"])
        except ValueError:
            return jsonify({"error": "invalid_time"}), 400

    # 커플 연결 시 공유 일정(couple_id), 미연결 시 개인 일정(user_id)
    s = Schedule(
        couple_id=g.user.couple_id,
        user_id=g.user.id,
        owner=owner,
        title=title,
        event_date=event_date,
        event_time=event_time,
        created_at=datetime.utcnow(),
    )
    db.session.add(s)
    db.session.commit()
    db.session.refresh(s)
    return jsonify(_to_dict(s)), 201


@bp.delete("/schedules/<int:schedule_id>")
@login_required
def delete_schedule(schedule_id: int):
    s = db.session.get(Schedule, schedule_id)
    if not s:
        return jsonify({"error": "not_found"}), 404
    # 공유(같은 커플) 또는 본인 개인 일정만 삭제 가능
    owns_couple = s.couple_id is not None and s.couple_id == g.user.couple_id
    owns_personal = s.couple_id is None and s.user_id == g.user.id
    if not (owns_couple or owns_personal):
        return jsonify({"error": "not_found"}), 404
    db.session.delete(s)
    db.session.commit()
    return jsonify({"ok": True})
