"""오늘의 연애 이슈 (DESIGN_UPDATE §5). 운영자 큐레이션 + A/B 투표 + 댓글."""
from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)

from ..extensions import db
from .enums import RELATIONSHIP_STATUSES

ISSUE_SIDES = ("a", "b")


class Issue(db.Model):
    __tablename__ = "issues"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    title = db.Column(String(120), nullable=False)
    summary = db.Column(String(200), nullable=False)
    source = db.Column(String(30), nullable=True)  # 출처명
    url = db.Column(String(300), nullable=True)  # 원문 아웃링크
    poll_option_a = db.Column(String(30), nullable=False)
    poll_option_b = db.Column(String(30), nullable=False)
    starts_at = db.Column(DateTime, nullable=True)
    is_active = db.Column(Boolean, nullable=False, default=True)
    comment_count = db.Column(Integer, nullable=False, default=0)
    # 언어권 (글로벌 확장) — 'ko' | 'en'. 언어권별 이슈 분리.
    lang = db.Column(String(5), nullable=False, default="ko", server_default="ko")
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (Index("idx_issue_active", "is_active", "created_at"),)


class IssueVote(db.Model):
    __tablename__ = "issue_votes"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    issue_id = db.Column(BigInteger, db.ForeignKey("issues.id"), nullable=False)
    user_id = db.Column(BigInteger, db.ForeignKey("users.id"), nullable=False)
    side = db.Column(Enum(*ISSUE_SIDES, name="issue_side"), nullable=False)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (UniqueConstraint("issue_id", "user_id", name="uq_issue_vote"),)


class IssueComment(db.Model):
    """이슈 댓글 (comments 미러, DECISIONS #3 — 기존 comments 무손상)."""

    __tablename__ = "issue_comments"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    issue_id = db.Column(BigInteger, db.ForeignKey("issues.id"), nullable=False)
    user_id = db.Column(BigInteger, db.ForeignKey("users.id"), nullable=False)
    parent_id = db.Column(BigInteger, db.ForeignKey("issue_comments.id"), nullable=True)
    body = db.Column(Text, nullable=False)
    like_count = db.Column(Integer, nullable=False, default=0)
    author_status = db.Column(Enum(*RELATIONSHIP_STATUSES, name="author_status_issue"), nullable=False)
    is_blinded = db.Column(Boolean, nullable=False, default=False)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    author = db.relationship("User", foreign_keys=[user_id])

    __table_args__ = (Index("idx_issue_comment", "issue_id", "created_at"),)
