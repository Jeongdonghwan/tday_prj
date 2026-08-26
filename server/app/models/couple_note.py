"""속마음이야기 — 커플 전용 회고 노트 (양식: 제목 / 좋았던 점 / 아쉬웠던 점 / 개선할 점).
커플 단위로 둘의 글이 한 타임라인에 보이고, 상대 글에 짧은 답글을 남길 수 있다."""
from datetime import datetime

from sqlalchemy import BigInteger, Date, DateTime, Index, String, Text

from ..extensions import db


class CoupleNote(db.Model):
    __tablename__ = "couple_notes"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    couple_id = db.Column(BigInteger, db.ForeignKey("couples.id"), nullable=False)
    author_id = db.Column(BigInteger, db.ForeignKey("users.id"), nullable=False)
    title = db.Column(String(80), nullable=False)
    good = db.Column(Text, nullable=True)      # 좋았던 점
    bad = db.Column(Text, nullable=True)       # 아쉬웠던 점
    improve = db.Column(Text, nullable=True)   # 개선할 점
    note_date = db.Column(Date, nullable=True)  # 기록 대상 날짜(여행일 등), 기본 작성일
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    author = db.relationship("User", foreign_keys=[author_id])
    comments = db.relationship(
        "CoupleNoteComment", backref="note", cascade="all, delete-orphan", order_by="CoupleNoteComment.created_at"
    )

    __table_args__ = (Index("idx_couple_note", "couple_id", "created_at"),)


class CoupleNoteComment(db.Model):
    __tablename__ = "couple_note_comments"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    note_id = db.Column(BigInteger, db.ForeignKey("couple_notes.id"), nullable=False)
    author_id = db.Column(BigInteger, db.ForeignKey("users.id"), nullable=False)
    body = db.Column(Text, nullable=False)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    author = db.relationship("User", foreign_keys=[author_id])
