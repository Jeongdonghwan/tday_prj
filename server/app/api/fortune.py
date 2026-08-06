"""연애운세 API (FORTUNE_UPDATE.md §5). 모두 로그인 필수.

  GET  /fortune/today          프로필+오늘 세그먼트+개인화(점수·행운·타로·스트릭·published)
  POST /fortune/profile        프로필 upsert (zodiac 서버계산)
  POST /fortune/read           오늘 열람 기록 → streak
  POST /fortune/compatibility  상대 생일 → 점수+코멘트
  GET  /fortune/history?days=30  최근 열람 가능 히스토리
"""
from datetime import date, datetime, timedelta

from flask import Blueprint, g, jsonify, request
from sqlalchemy import select

from ..auth import login_required
from ..extensions import db
from ..fortune.kst import kst_now, kst_today, zodiac_of
from ..fortune.packs import sign_name, sun_sign_of
from ..fortune.personalize import compatibility, personalize, tarot_card
from ..fortune.thread import daily_thread_id
from ..models import DailyFortune, FortuneProfile, FortuneRead
from ..models.enums import FORTUNE_GENDERS, FORTUNE_LOVE_STATUSES, FORTUNE_PUSH_TIMES

bp = Blueprint("fortune", __name__)

# 세그먼트 메모리 캐시 (날짜 바뀌면 무효화) — 48행 대상, 개인화는 요청 시 계산
_seg_cache: dict = {"date": None, "rows": {}}


def reset_seg_cache() -> None:
    """테스트/생성 후 캐시 무효화 (conftest 및 배치에서 호출)."""
    _seg_cache["date"] = None
    _seg_cache["rows"] = {}


def _segment(d: date, zodiac: int, status: str, lang: str = "ko"):
    """daily_fortunes 세그먼트 (날짜 단위 메모리 캐시). 언어권별 세그먼트 격리."""
    if _seg_cache["date"] != d:
        rows = db.session.scalars(select(DailyFortune).where(DailyFortune.fortune_date == d)).all()
        _seg_cache["date"] = d
        _seg_cache["rows"] = {(r.zodiac, r.love_status, r.lang): r for r in rows}
    return _seg_cache["rows"].get((zodiac, status, lang))


def _streak(user_id: int, today: date) -> int:
    """오늘부터 역순으로 연속 열람일 수. (오늘 미열람이면 어제부터 카운트)."""
    rows = db.session.scalars(
        select(FortuneRead.fortune_date)
        .where(FortuneRead.user_id == user_id, FortuneRead.fortune_date <= today)
        .order_by(FortuneRead.fortune_date.desc())
        .limit(400)
    ).all()
    days = set(rows)
    streak = 0
    cur = today
    if today not in days:  # 오늘 아직 안 봤으면 어제부터
        cur = today - timedelta(days=1)
    while cur in days:
        streak += 1
        cur -= timedelta(days=1)
    return streak


def _today_payload(profile: FortuneProfile, lang: str = "ko") -> dict:
    """오늘(또는 00시 이전이면 어제) 세그먼트 + 개인화 결합. lang 으로 콘텐츠 언어권 선택."""
    today = kst_today()
    seg = _segment(today, profile.zodiac, profile.love_status, lang)
    published = True
    if seg is None or seg.published_at > kst_now():
        # 00시 이전 방어 — 어제 운세 노출
        published = False
        seg = _segment(today - timedelta(days=1), profile.zodiac, profile.love_status, lang)
    if seg is None:
        return {"registered": True, "published": False, "date": today.isoformat(), "unavailable": True}

    pz = personalize(profile.user_id, seg.fortune_date, lang)
    # 항목: 앞 2개는 점수, 3번째(주의보)는 점수 없음
    cats = []
    for i, c in enumerate(seg.cat_labels):
        cats.append({
            "name": c["name"], "comment": c["comment"],
            "score": pz["cat_scores"][i] if i < 2 else None,
        })
    return {
        "registered": True,
        "published": published,
        "date": seg.fortune_date.isoformat(),
        "nickname": g.user.nickname,
        "zodiac": sign_name(profile.zodiac, lang),
        "love_status": profile.love_status,
        "score": pz["score"],
        "summary": seg.summary,
        "full_text": seg.full_text,
        "cats": cats,
        "lucky": pz["lucky"],
        "tarot": tarot_card(pz["tarot_index"], lang),
        "streak": _streak(profile.user_id, today),
        # 데일리 스레드 배너 링크 (없으면 None → 배너 미노출)
        "thread_id": daily_thread_id(today),
    }


@bp.get("/fortune/today")
@login_required
def today():
    profile = db.session.get(FortuneProfile, g.user.id)
    if profile is None:
        return jsonify({"registered": False})
    return jsonify(_today_payload(profile, g.user.lang))


@bp.get("/fortune/profile")
@login_required
def get_profile():
    """운세 설정 화면용 — 저장된 프로필(없으면 registered:false)."""
    p = db.session.get(FortuneProfile, g.user.id)
    if p is None:
        return jsonify({"registered": False})
    return jsonify({
        "registered": True,
        "birth_date": p.birth_date.isoformat(),
        "birth_time": p.birth_time,
        "gender": p.gender,
        "love_status": p.love_status,
        "push_enabled": p.push_enabled,
        "push_time": p.push_time,
    })


@bp.post("/fortune/profile")
@login_required
def upsert_profile():
    data = request.get_json(silent=True) or {}
    birth_str = (data.get("birth_date") or "").strip()
    try:
        birth = datetime.strptime(birth_str, "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "invalid_birth_date"}), 400
    gender = data.get("gender")
    love_status = data.get("love_status")
    if gender not in FORTUNE_GENDERS:
        return jsonify({"error": "invalid_gender"}), 400
    if love_status not in FORTUNE_LOVE_STATUSES:
        return jsonify({"error": "invalid_love_status"}), 400

    birth_time = data.get("birth_time")  # 0~11 or None
    if birth_time is not None:
        try:
            birth_time = int(birth_time)
            if not (0 <= birth_time <= 11):
                birth_time = None
        except (TypeError, ValueError):
            birth_time = None

    push_time = data.get("push_time", "00")
    if push_time not in FORTUNE_PUSH_TIMES:
        push_time = "00"

    profile = db.session.get(FortuneProfile, g.user.id) or FortuneProfile(user_id=g.user.id)
    profile.birth_date = birth
    profile.birth_time = birth_time
    profile.gender = gender
    profile.love_status = love_status
    # ko=십이지(생년), en=서양 별자리(월/일). zodiac 슬롯(0~11)을 언어권 부호로 재사용.
    profile.zodiac = sun_sign_of(birth) if g.user.lang == "en" else zodiac_of(birth)
    profile.push_enabled = bool(data.get("push_enabled", False))
    profile.push_time = push_time
    if not db.session.get(FortuneProfile, g.user.id):
        db.session.add(profile)
    db.session.commit()
    return jsonify(_today_payload(profile, g.user.lang))


@bp.post("/fortune/read")
@login_required
def read():
    today = kst_today()
    existing = db.session.get(FortuneRead, (g.user.id, today))
    if existing is None:
        db.session.add(FortuneRead(user_id=g.user.id, fortune_date=today))
        db.session.commit()
    return jsonify({"streak": _streak(g.user.id, today)})


@bp.post("/fortune/compatibility")
@login_required
def compat():
    from ..models import CompatibilityLog

    profile = db.session.get(FortuneProfile, g.user.id)
    if profile is None:
        return jsonify({"error": "profile_required"}), 400
    data = request.get_json(silent=True) or {}
    try:
        partner = datetime.strptime((data.get("partner_birth") or "").strip(), "%Y-%m-%d").date()
    except ValueError:
        return jsonify({"error": "invalid_partner_birth"}), 400

    today = kst_today()
    result = compatibility(profile.birth_date.isoformat(), partner.isoformat(), today, g.user.lang)
    db.session.add(CompatibilityLog(user_id=g.user.id, partner_birth=partner, score=result["score"]))
    db.session.commit()
    return jsonify(result)


@bp.get("/fortune/history")
@login_required
def history():
    profile = db.session.get(FortuneProfile, g.user.id)
    if profile is None:
        return jsonify({"items": []})
    days = min(int(request.args.get("days", 30) or 30), 90)
    today = kst_today()
    since = today - timedelta(days=days)
    reads = db.session.scalars(
        select(FortuneRead.fortune_date)
        .where(FortuneRead.user_id == g.user.id, FortuneRead.fortune_date >= since, FortuneRead.fortune_date <= today)
        .order_by(FortuneRead.fortune_date.desc())
    ).all()
    items = []
    for d in reads:
        seg = _segment(d, profile.zodiac, profile.love_status, g.user.lang)
        if not seg:
            continue
        items.append({
            "date": d.isoformat(),
            "score": personalize(g.user.id, d, g.user.lang)["score"],
            "summary": seg.summary,
            "full_text": seg.full_text,
        })
    return jsonify({"items": items})
