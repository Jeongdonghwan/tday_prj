from datetime import datetime

from sqlalchemy import BigInteger, Date, DateTime, Enum, Index, String, Time

from ..extensions import db
from .enums import SCHEDULE_OWNERS


class Schedule(db.Model):
    __tablename__ = "schedules"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    # 커플 연결 시 공유(couple_id), 미연결 시 개인(user_id) — 둘 중 하나로 스코프
    couple_id = db.Column(BigInteger, db.ForeignKey("couples.id"), nullable=True)
    user_id = db.Column(BigInteger, db.ForeignKey("users.id"), nullable=True)
    owner = db.Column(Enum(*SCHEDULE_OWNERS, name="schedule_owner"), nullable=False)  # 나=a/상대=b/함께=both
    title = db.Column(String(80), nullable=False)
    event_date = db.Column(Date, nullable=False)
    event_time = db.Column(Time, nullable=True)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_couple_date", "couple_id", "event_date"),
        Index("idx_user_date", "user_id", "event_date"),
    )
