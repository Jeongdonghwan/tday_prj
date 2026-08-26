"""연애운세 세그먼트 생성 (FORTUNE_UPDATE.md §4) — B안: AI 매일 생성 + 폴백 풀 안전망.

ANTHROPIC_API_KEY 가 있으면 상태(4)×언어별로 Claude 가 띠/별자리 12개 본문을 새로 쓴다(ai.py).
호출 실패·불완전 응답이면 해당 상태만 폴백 풀(날짜×띠×상태 해시 결정론)로 채우고 텔레그램 알림.
키가 없으면 전부 폴백(무료 모드). verify_for_date 는 48행 미만일 때 폴백으로 보충하는 2차 안전망.
"""
import hashlib
import json
import os
from datetime import date

from flask import current_app

from ..alerts import send_alert
from ..extensions import db
from ..models import DailyFortune
from ..models.enums import FORTUNE_LOVE_STATUSES
from .ai import FortuneAIError, generate_segments_ai
from .kst import kst_midnight_utc

# 직전 generate_for_date 실행 통계 (CLI 출력·테스트용)
LAST_RUN = {"ai": 0, "fallback": 0}

_FALLBACK_PATHS = {
    "ko": os.path.join(os.path.dirname(__file__), "fallbacks.json"),
    "en": os.path.join(os.path.dirname(__file__), "fallbacks_en.json"),
}
_FALLBACKS: dict = {}


def _pools(lang: str = "ko") -> dict:
    """언어권별 폴백 풀 (지연 로드·캐시)."""
    if lang not in _FALLBACKS:
        path = _FALLBACK_PATHS.get(lang, _FALLBACK_PATHS["ko"])
        with open(path, encoding="utf-8") as f:
            _FALLBACKS[lang] = json.load(f)
    return _FALLBACKS[lang]


def _seed(*parts) -> int:
    return int(hashlib.sha256(":".join(str(p) for p in parts).encode()).hexdigest(), 16)


def _pick_fallback(fortune_date: date, zodiac: int, status: str, lang: str = "ko") -> dict:
    """날짜×띠(별자리)×상태 해시로 언어권 상태 풀에서 세그먼트 결정론 선택."""
    pool = _pools(lang)[status]
    idx = _seed(fortune_date.isoformat(), zodiac, status, lang) % len(pool)
    return pool[idx]


def generate_for_date(fortune_date: date, lang: str = "ko", overwrite: bool = False, ai: bool | None = None) -> int:
    """해당 날짜·언어권의 48세그먼트(띠/별자리 12 × 상태 4)를 생성/upsert. 생성된 행 수 반환.
    ai=None 이면 ANTHROPIC_API_KEY 유무로 자동 결정. 상태별로 AI 시도 → 실패 시 그 상태만 폴백."""
    if ai is None:
        ai = bool(current_app.config.get("ANTHROPIC_API_KEY"))
    published = kst_midnight_utc(fortune_date)
    made = 0
    LAST_RUN["ai"] = 0
    LAST_RUN["fallback"] = 0
    for status in FORTUNE_LOVE_STATUSES:
        # 덮어쓰지 않을 때 이미 12행 다 있으면 API 호출 자체를 건너뜀
        if not overwrite:
            have = DailyFortune.query.filter_by(fortune_date=fortune_date, love_status=status, lang=lang).count()
            if have >= 12:
                continue
        ai_segs: dict[int, dict] | None = None
        if ai:
            try:
                ai_segs = generate_segments_ai(fortune_date, status, lang)
            except FortuneAIError as e:
                send_alert(f"[운세] AI 생성 실패 → 폴백 사용 {fortune_date} {lang}/{status}: {e}")
        for zodiac in range(12):
            existing = DailyFortune.query.filter_by(
                fortune_date=fortune_date, zodiac=zodiac, love_status=status, lang=lang
            ).first()
            if existing and not overwrite:
                continue
            seg = ai_segs[zodiac] if ai_segs else _pick_fallback(fortune_date, zodiac, status, lang)
            row = existing or DailyFortune(
                fortune_date=fortune_date, zodiac=zodiac, love_status=status, lang=lang
            )
            row.summary = seg["summary"]
            row.full_text = seg["full_text"]
            row.cat_labels = seg["cats"]
            row.published_at = published
            row.is_fallback = ai_segs is None
            if not existing:
                db.session.add(row)
            made += 1
            LAST_RUN["ai" if ai_segs else "fallback"] += 1
    db.session.commit()
    # 방금 만든 날짜가 캐시에 비어있게 잡혀 있으면 무효화 (같은 프로세스 내 즉시 반영)
    from ..api.fortune import reset_seg_cache

    reset_seg_cache()
    return made


def verify_for_date(fortune_date: date, lang: str = "ko") -> int:
    """해당 언어권 48행 미만이면 부족분을 폴백으로 채움. 채운 행 수 반환."""
    have = DailyFortune.query.filter_by(fortune_date=fortune_date, lang=lang).count()
    if have >= 48:
        return 0
    filled = generate_for_date(fortune_date, lang=lang, overwrite=False, ai=False)
    if filled:
        send_alert(f"[운세] 검증 보충 {fortune_date} {lang}: {have}행 → 폴백 {filled}행 추가")
    return filled
