"""KST(Asia/Seoul) 시간 헬퍼 — 서버 TZ 무관하게 자정 기준을 KST 로 고정.

DB 는 UTC(naive utcnow)로 저장하므로, 운세 '오늘 날짜'와 공개시각 비교는 KST 로 계산한다.
"""
from datetime import date, datetime, timedelta

KST_OFFSET = timedelta(hours=9)


def kst_now() -> datetime:
    """현재 KST 시각(naive)."""
    return datetime.utcnow() + KST_OFFSET


def kst_today() -> date:
    """KST 기준 오늘 날짜."""
    return kst_now().date()


def kst_midnight_utc(d: date) -> datetime:
    """KST 날짜 d 의 자정(00:00 KST)을 UTC naive 로 환산 → daily_fortunes.published_at 저장용."""
    kst_mid = datetime(d.year, d.month, d.day)  # 00:00 KST
    return kst_mid - KST_OFFSET


def zodiac_of(birth: date) -> int:
    """생년(연도) 기준 띠 인덱스 0~11. 0=쥐, 1=소, ... (1900년=쥐=0 기준)."""
    return (birth.year - 1900) % 12
