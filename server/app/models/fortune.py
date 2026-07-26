"""오늘의 연애운세 (FORTUNE_UPDATE.md §3).

- fortune_profiles : 유저 운세 프로필(생년월일·태어난시·성별·연애상태·푸시)
- daily_fortunes   : 날짜×띠×연애상태 = 하루 48세그먼트(한줄/전문/항목라벨)
- fortune_reads    : 열람 기록(스트릭 계산)
- compatibility_logs: 궁합 조회 로그
"""
from datetime import datetime

from sqlalchemy import (
    JSON,
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Enum,
    Index,
    SmallInteger,
    String,
    Text,
    UniqueConstraint,
)

from ..extensions import db
from .enums import FORTUNE_GENDERS, FORTUNE_LOVE_STATUSES, FORTUNE_PUSH_TIMES


class FortuneProfile(db.Model):
    __tablename__ = "fortune_profiles"

    user_id = db.Column(BigInteger, db.ForeignKey("users.id"), primary_key=True)
    birth_date = db.Column(Date, nullable=False)
    birth_time = db.Column(SmallInteger, nullable=True)  # 십이시진 0~11, NULL=모름
    gender = db.Column(Enum(*FORTUNE_GENDERS, name="fortune_gender"), nullable=False)
    love_status = db.Column(Enum(*FORTUNE_LOVE_STATUSES, name="fortune_love_status"), nullable=False)
    zodiac = db.Column(SmallInteger, nullable=False)  # 띠 0~11 (birth_date 에서 계산 저장)
    push_enabled = db.Column(Boolean, nullable=False, default=False)
    push_time = db.Column(Enum(*FORTUNE_PUSH_TIMES, name="fortune_push_time"), nullable=False, default="00")
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)


class DailyFortune(db.Model):
    __tablename__ = "daily_fortunes"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    fortune_date = db.Column(Date, nullable=False)
    zodiac = db.Column(SmallInteger, nullable=False)
    love_status = db.Column(Enum(*FORTUNE_LOVE_STATUSES, name="fortune_seg_love_status"), nullable=False)
    summary = db.Column(String(120), nullable=False)  # 한줄운세
    full_text = db.Column(Text, nullable=False)
    cat_labels = db.Column(JSON, nullable=False)  # [{"name":"데이트운","comment":"..."}, ...] 3항목
    published_at = db.Column(DateTime, nullable=False)  # KST 자정 공개 시각(UTC 저장)
    is_fallback = db.Column(Boolean, nullable=False, default=False)

    __table_args__ = (
        UniqueConstraint("fortune_date", "zodiac", "love_status", name="uq_fortune_seg"),
    )


class FortuneRead(db.Model):
    __tablename__ = "fortune_reads"

    user_id = db.Column(BigInteger, db.ForeignKey("users.id"), primary_key=True)
    fortune_date = db.Column(Date, primary_key=True)
    opened_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)


class CompatibilityLog(db.Model):
    __tablename__ = "compatibility_logs"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = db.Column(BigInteger, db.ForeignKey("users.id"), nullable=False)
    partner_birth = db.Column(Date, nullable=False)
    score = db.Column(SmallInteger, nullable=False)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (Index("idx_comp_user", "user_id", "created_at"),)
