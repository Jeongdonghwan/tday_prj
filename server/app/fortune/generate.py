"""연애운세 세그먼트 생성 (FORTUNE_UPDATE.md §4).

이번 구현은 **폴백 풀 결정론 배정**(무료, Claude API 미사용). 날짜×띠×상태 해시로
fallbacks.json 풀에서 세그먼트를 골라 daily_fortunes 에 48행/일 저장한다.
AI 경로(_generate_ai)는 훅만 남겨두고 미사용 — ANTHROPIC 키 확보 시 활성화 가능.
"""
import hashlib
import json
import os
from datetime import date

from ..extensions import db
from ..models import DailyFortune
from ..models.enums import FORTUNE_LOVE_STATUSES
from .kst import kst_midnight_utc

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


def generate_for_date(fortune_date: date, lang: str = "ko", overwrite: bool = False) -> int:
    """해당 날짜·언어권의 48세그먼트(띠/별자리 12 × 상태 4)를 생성/upsert. 생성된 행 수 반환."""
    published = kst_midnight_utc(fortune_date)
    made = 0
    for zodiac in range(12):
        for status in FORTUNE_LOVE_STATUSES:
            existing = DailyFortune.query.filter_by(
                fortune_date=fortune_date, zodiac=zodiac, love_status=status, lang=lang
            ).first()
            if existing and not overwrite:
                continue
            seg = _pick_fallback(fortune_date, zodiac, status, lang)
            row = existing or DailyFortune(
                fortune_date=fortune_date, zodiac=zodiac, love_status=status, lang=lang
            )
            row.summary = seg["summary"]
            row.full_text = seg["full_text"]
            row.cat_labels = seg["cats"]
            row.published_at = published
            row.is_fallback = True  # 폴백 전용 모드
            if not existing:
                db.session.add(row)
            made += 1
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
    return generate_for_date(fortune_date, lang=lang, overwrite=False)
