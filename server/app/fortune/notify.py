"""연애운세 코호트 푸시 (FORTUNE_UPDATE.md §6). 수신자별 개인화 티저.

크론 00:00 / 07:00 / 09:00 (KST) 에 push_time 코호트별로 발송.
- 00시: 🌙 자정이에요 / 오늘 {nickname}님의 연애운은... {score}점!
- 07·09시: ☀️ 오늘의 연애운이 도착했어요 / {summary 앞 20자}...

score·summary 는 발송 시점(오늘 KST)에 해시·세그먼트로 계산 → 수신자별 개인화.
딥링크: data.type="fortune" → todaylove://fortune (usePushRouting).
"""
from datetime import date

from sqlalchemy import select

from ..extensions import db
from ..models import DailyFortune, FortuneProfile, User
from ..push import send_push
from .personalize import personalize


def _teaser(cohort: str, nickname: str, score: int, summary: str) -> tuple[str, str]:
    """코호트별 (title, body) 티저 문구 (§6)."""
    if cohort == "00":
        return "🌙 자정이에요", f"오늘 {nickname}님의 연애운은... {score}점!"
    return "☀️ 오늘의 연애운이 도착했어요", f"{summary[:20]}..."


def notify_cohort(cohort: str, d: date) -> dict:
    """push_time=cohort & push_enabled 인 유저에게 개인화 푸시. 발송 수 등 요약 반환."""
    # 오늘(KST) 세그먼트 맵 — (zodiac, love_status) → summary
    seg_rows = db.session.scalars(
        select(DailyFortune).where(DailyFortune.fortune_date == d)
    ).all()
    seg_map = {(r.zodiac, r.love_status): r for r in seg_rows}

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
        seg = seg_map.get((profile.zodiac, profile.love_status))
        if seg is None:
            skipped += 1  # 오늘 세그먼트 미생성(방어) — 건너뜀
            continue
        pz = personalize(user.id, d)
        title, body = _teaser(cohort, user.nickname, pz["score"], seg.summary)
        sent += send_push([user.push_token], title, body, {"type": "fortune"})

    return {"cohort": cohort, "date": d.isoformat(), "targets": len(rows), "sent": sent, "skipped": skipped}
