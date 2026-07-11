from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, String, UniqueConstraint

from ..extensions import db
from .enums import REPORT_TARGETS


class Report(db.Model):
    """신고 — 스펙 §10: 신고/차단 없으면 커뮤니티 앱 애플 리젝."""

    __tablename__ = "reports"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    target_type = db.Column(Enum(*REPORT_TARGETS, name="report_target"), nullable=False)
    target_id = db.Column(BigInteger, nullable=False)
    reporter_id = db.Column(BigInteger, db.ForeignKey("users.id"), nullable=False)
    reason = db.Column(String(50), nullable=True)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)


class Block(db.Model):
    """차단 — 피드·댓글 쿼리에서 조인 필터로 상대 콘텐츠 제외."""

    __tablename__ = "blocks"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = db.Column(BigInteger, db.ForeignKey("users.id"), nullable=False)
    blocked_user_id = db.Column(BigInteger, db.ForeignKey("users.id"), nullable=False)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("user_id", "blocked_user_id", name="uq_block"),
    )
