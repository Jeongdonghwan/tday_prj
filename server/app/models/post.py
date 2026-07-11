from datetime import datetime

from sqlalchemy import (
    BigInteger,
    Boolean,
    DateTime,
    Enum,
    Float,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
)

from ..extensions import db
from .enums import POLL_SIDES, POST_CATEGORIES, RELATIONSHIP_STATUSES


class Post(db.Model):
    __tablename__ = "posts"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    user_id = db.Column(BigInteger, db.ForeignKey("users.id"), nullable=False)
    category = db.Column(Enum(*POST_CATEGORIES, name="post_category"), nullable=False)
    title = db.Column(String(120), nullable=False)
    body = db.Column(Text, nullable=True)
    is_poll = db.Column(Boolean, nullable=False, default=False)  # 투표글/일반글 구분
    # 작성 시점 상태 스냅샷 (나중에 바꿔도 과거 글은 유지)
    author_status = db.Column(Enum(*RELATIONSHIP_STATUSES, name="author_status_post"), nullable=False)
    view_count = db.Column(Integer, nullable=False, default=0)
    like_count = db.Column(Integer, nullable=False, default=0)
    comment_count = db.Column(Integer, nullable=False, default=0)
    hot_score = db.Column(Float, nullable=False, default=0)   # BEST 정렬용, 5분 배치 갱신
    is_blinded = db.Column(Boolean, nullable=False, default=False)  # 신고 누적 시 가림
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    options = db.relationship("PollOption", backref="post", cascade="all, delete-orphan")
    author = db.relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("idx_cat_created", "category", "created_at"),
        Index("idx_hot", hot_score.desc()),
    )


class PollOption(db.Model):
    __tablename__ = "poll_options"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    post_id = db.Column(BigInteger, db.ForeignKey("posts.id"), nullable=False)
    side = db.Column(Enum(*POLL_SIDES, name="poll_side"), nullable=False)
    label = db.Column(String(40), nullable=False)  # 작성자 입력 멘트
    vote_count = db.Column(Integer, nullable=False, default=0)


class Vote(db.Model):
    __tablename__ = "votes"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    post_id = db.Column(BigInteger, db.ForeignKey("posts.id"), nullable=False)
    user_id = db.Column(BigInteger, db.ForeignKey("users.id"), nullable=False)
    option_side = db.Column(Enum(*POLL_SIDES, name="vote_side"), nullable=False)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    # 중복투표는 DB 레벨에서 차단 (스펙 못박기)
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_vote"),
    )


class Comment(db.Model):
    __tablename__ = "comments"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    post_id = db.Column(BigInteger, db.ForeignKey("posts.id"), nullable=False)
    user_id = db.Column(BigInteger, db.ForeignKey("users.id"), nullable=False)
    parent_id = db.Column(BigInteger, db.ForeignKey("comments.id"), nullable=True)  # 대댓글
    body = db.Column(Text, nullable=False)
    like_count = db.Column(Integer, nullable=False, default=0)
    author_status = db.Column(Enum(*RELATIONSHIP_STATUSES, name="author_status_comment"), nullable=False)
    is_blinded = db.Column(Boolean, nullable=False, default=False)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    author = db.relationship("User", foreign_keys=[user_id])

    __table_args__ = (
        Index("idx_post", "post_id", "created_at"),
    )
