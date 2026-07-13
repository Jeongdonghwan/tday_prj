"""오늘의 질문(데일리 폴) 등록 서비스 — 새 폴 활성화 시 이전 활성 폴 자동 비활성."""
from datetime import date as date_cls

from ..extensions import db
from ..models import DailyPoll


def create_daily_poll(question, choice_a, choice_b, choice_c=None, scheduled_date=None):
    # 한 번에 하나만 활성
    DailyPoll.query.filter_by(is_active=True).update({"is_active": False})
    poll = DailyPoll(
        question=question,
        choice_a=choice_a,
        choice_b=choice_b,
        choice_c=(choice_c or None),
        scheduled_date=scheduled_date or date_cls.today(),
        is_active=True,
    )
    db.session.add(poll)
    db.session.commit()
    return poll
