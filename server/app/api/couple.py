"""커플 연결 API (스펙 §7, 6단계).

  POST  /couple/invite        초대코드 생성
  POST  /couple/join          { code }
  PATCH /couple/start-date    { date }   (YYYY-MM-DD)
  GET   /couple/dday
"""
import secrets
import string
from datetime import date, datetime, timedelta

from flask import Blueprint, g, jsonify, request
from sqlalchemy import select

from ..auth import login_required
from ..extensions import db
from ..models import Couple, User

bp = Blueprint("couple", __name__)

_ALPHABET = string.ascii_uppercase + string.digits


def _gen_code() -> str:
    for _ in range(30):
        code = "".join(secrets.choice(_ALPHABET) for _ in range(6))
        if not db.session.scalar(select(Couple.id).where(Couple.invite_code == code)):
            return code
    raise RuntimeError("초대코드 생성 실패")


def _couple_of(user) -> Couple | None:
    return db.session.get(Couple, user.couple_id) if user.couple_id else None


def _partner_nickname(couple: Couple, me_id: int) -> str | None:
    other_id = couple.user_b if couple.user_a == me_id else couple.user_a
    if not other_id:
        return None
    other = db.session.get(User, other_id)
    return other.nickname if other else None


@bp.post("/couple/invite")
@login_required
def invite():
    couple = _couple_of(g.user)
    if couple:
        return jsonify({"invite_code": couple.invite_code, "connected": couple.user_b is not None})

    couple = Couple(user_a=g.user.id, invite_code=_gen_code(), created_at=datetime.utcnow())
    db.session.add(couple)
    db.session.flush()
    g.user.couple_id = couple.id
    db.session.commit()
    return jsonify({"invite_code": couple.invite_code, "connected": False}), 201


@bp.post("/couple/join")
@login_required
def join():
    code = (request.get_json(silent=True) or {}).get("code", "").strip().upper()
    if not code:
        return jsonify({"error": "code_required"}), 400

    couple = db.session.scalar(select(Couple).where(Couple.invite_code == code))
    if not couple:
        return jsonify({"error": "invalid_code", "message": "코드를 찾을 수 없어요."}), 404
    if couple.user_a == g.user.id:
        return jsonify({"error": "own_code", "message": "내 코드는 입력할 수 없어요."}), 400
    if couple.user_b is not None:
        return jsonify({"error": "already_full", "message": "이미 연결된 코드예요."}), 409

    couple.user_b = g.user.id
    g.user.couple_id = couple.id
    g.user.relationship_status = "couple"
    # 상대도 커플 상태로
    partner = db.session.get(User, couple.user_a)
    if partner:
        partner.couple_id = couple.id
        partner.relationship_status = "couple"
    db.session.commit()
    return jsonify({"ok": True, "couple_id": couple.id, "partner": _partner_nickname(couple, g.user.id)})


@bp.patch("/couple/start-date")
@login_required
def start_date():
    couple = _couple_of(g.user)
    if not couple:
        return jsonify({"error": "no_couple"}), 400
    raw = (request.get_json(silent=True) or {}).get("date")
    try:
        d = date.fromisoformat(raw)
    except (TypeError, ValueError):
        return jsonify({"error": "invalid_date"}), 400
    couple.start_date = d  # 둘 중 누가 정해도 함께 적용
    db.session.commit()
    return jsonify({"ok": True, "start_date": d.isoformat()})


def _next_milestone(start: date, today: date):
    """다음 기념일: 100일 단위 + 연 단위 중 가장 가까운 미래 (label, d_day)."""
    days_together = (today - start).days + 1
    candidates: list[tuple[str, date]] = []

    # 다음 100일 단위 (1일째 = start 당일)
    next_hundred = ((days_together // 100) + 1) * 100
    candidates.append((f"{next_hundred}일", start + timedelta(days=next_hundred - 1)))

    # 다음 N주년
    for y in range(1, 100):
        try:
            anni = start.replace(year=start.year + y)
        except ValueError:  # 2/29 → 2/28
            anni = start.replace(year=start.year + y, month=2, day=28)
        if anni >= today:
            candidates.append((f"{y}주년", anni))
            break

    label, target = min(candidates, key=lambda c: (c[1] - today).days)
    return label, (target - today).days


@bp.get("/couple/dday")
@login_required
def dday():
    couple = _couple_of(g.user)
    if not couple:
        return jsonify({"connected": False})

    partner = _partner_nickname(couple, g.user.id)
    result = {
        "connected": couple.user_b is not None,
        "partner": partner,
        "start_date": couple.start_date.isoformat() if couple.start_date else None,
    }
    if couple.start_date:
        today = date.today()
        result["days"] = (today - couple.start_date).days + 1
        label, d = _next_milestone(couple.start_date, today)
        result["next"] = {"label": label, "d_day": d}
    return jsonify(result)
