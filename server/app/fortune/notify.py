"""연애운세 코호트 푸시 (FORTUNE_UPDATE.md §6). 수신자별 개인화 티저.

크론 00:00 / 07:00 / 09:00 (KST) 에 push_time 코호트별로 발송. 수신자 언어권(ko/en)별 문구.
- ko 00시: 🌙 자정이에요 / 오늘 {nickname}님의 연애운은... {score}점!
- ko 07·09시: ☀️ 오늘의 연애운이 도착했어요 / {summary 앞 20자}...
- en 00시: 🌙 It's midnight / {nickname}, your love score today is... {score}!
- en 07·09시: ☀️ Your love horoscope is in / {summary 앞 40자}...

score·summary 는 발송 시점(오늘 KST)에 해시·세그먼트로 계산 → 수신자별 개인화.
딥링크: data.type="fortune" → todaylove://fortune (usePushRouting).
"""
from datetime import date

from sqlalchemy import select

from ..extensions import db
from ..models import DailyFortune, FortuneProfile, User
from ..push import send_push
from .personalize import personalize


def _teaser(cohort: str, nickname: str, score: int, summary: str, lang: str = "ko") -> tuple[str, str]:
    """코호트·언어권별 (title, body) 티저 문구 (§6)."""
    if lang == "en":
        if cohort == "00":
            return "🌙 It's midnight", f"{nickname}, your love score today is... {score}!"
        return "☀️ Your love horoscope is in", f"{summary[:40]}..."
    if cohort == "00":
        return "🌙 자정이에요", f"오늘 {nickname}님의 연애운은... {score}점!"
    return "☀️ 오늘의 연애운이 도착했어요", f"{summary[:20]}..."


def notify_cohort(cohort: str, d: date) -> dict:
    """push_time=cohort & push_enabled 인 유저에게 개인화 푸시. 발송 수 등 요약 반환.
    세그먼트·티저는 수신자 언어권(user.lang) 기준."""
    # 오늘(KST) 세그먼트 맵 — (zodiac, love_status, lang) → summary
    seg_rows = db.session.scalars(
        select(DailyFortune).where(DailyFortune.fortune_date == d)
    ).all()
    seg_map = {(r.zodiac, r.love_status, r.lang): r for r in seg_rows}

    rows = db.session.execute(
        select(FortuneProfile, User)
        .join(User, User.id == FortuneProfile.user_id)
        .where(
            FortuneProfile.push_enabled.is_(True),
            FortuneProfile.push_time == cohort,
            User.push_token.isnot(None),
        )
    ).all()

    sent = 0
    skipped = 0
    for profile, user in rows:
        seg = seg_map.get((profile.zodiac, profile.love_status, user.lang))
        if seg is None:
            skipped += 1  # 오늘(언어권) 세그먼트 미생성(방어) — 건너뜀
            continue
        pz = personalize(user.id, d, user.lang)
        title, body = _teaser(cohort, user.nickname, pz["score"], seg.summary, user.lang)
        sent += send_push([user.push_token], title, body, {"type": "fortune"})

    return {"cohort": cohort, "date": d.isoformat(), "targets": len(rows), "sent": sent, "skipped": skipped}
