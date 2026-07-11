from datetime import datetime

from sqlalchemy import BigInteger, Date, DateTime, Index, Text, UniqueConstraint

from ..extensions import db


class DailyQuestion(db.Model):
    __tablename__ = "daily_questions"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    question = db.Column(Text, nullable=False)
    scheduled_date = db.Column(Date, nullable=False)

    __table_args__ = (
        Index("idx_date", "scheduled_date"),
    )


class DailyAnswer(db.Model):
    __tablename__ = "daily_answers"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    question_id = db.Column(BigInteger, db.ForeignKey("daily_questions.id"), nullable=False)
    user_id = db.Column(BigInteger, db.ForeignKey("users.id"), nullable=False)
    # 미연결이면 NULL (1인 모드 보장 — 스펙 못박기)
    couple_id = db.Column(BigInteger, nullable=True)
    answer = db.Column(Text, nullable=False)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("question_id", "user_id", name="uq_answer"),
    )
