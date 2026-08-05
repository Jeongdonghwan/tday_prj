"""커뮤니티 A/B(최대 3지) 데일리 폴 (DESIGN_UPDATE §3). 기존 커플 자유서술형 daily 와 별개."""
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, Date, DateTime, Enum, Index, String, Text, UniqueConstraint

from ..extensions import db

POLL_SIDES = ("a", "b", "c")


class DailyPoll(db.Model):
    __tablename__ = "daily_polls"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    question = db.Column(Text, nullable=False)
    choice_a = db.Column(String(40), nullable=False)
    choice_b = db.Column(String(40), nullable=False)
    choice_c = db.Column(String(40), nullable=True)  # 3지선다 (선택)
    scheduled_date = db.Column(Date, nullable=False)
    is_active = db.Column(Boolean, nullable=False, default=True)
    # 언어권 (글로벌 확장) — 'ko' | 'en'. 언어권별 데일리 폴 분리.
    lang = db.Column(String(5), nullable=False, default="ko", server_default="ko")
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (Index("idx_poll_active", "is_active", "scheduled_date"),)


class DailyPollVote(db.Model):
    __tablename__ = "daily_poll_votes"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    poll_id = db.Column(BigInteger, db.ForeignKey("daily_polls.id"), nullable=False)
    user_id = db.Column(BigInteger, db.ForeignKey("users.id"), nullable=False)
    side = db.Column(Enum(*POLL_SIDES, name="daily_poll_side"), nullable=False)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("poll_id", "user_id", name="uq_daily_poll_vote"),)
