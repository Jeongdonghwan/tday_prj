"""K-Story 파이프라인 (글로벌 확장 Phase 2).

한국 인기글 → 후보 선정 → Claude 번역·각색 → 관리자 검수 → 영어 피드 게시.
상태 전이: candidate → translated → approved|rejected → published
"""
from datetime import datetime

from sqlalchemy import BigInteger, DateTime, String, Text, UniqueConstraint

from ..extensions import db

# 상태값 (하드코딩 대신 참조)
KSTORY_STATUSES = ("candidate", "translated", "approved", "rejected", "published")


class KStoryCandidate(db.Model):
    __tablename__ = "kstory_candidates"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    source_post_id = db.Column(BigInteger, nullable=False)  # 원본(ko) 글 id
    status = db.Column(String(20), nullable=False, default="candidate", server_default="candidate")
    translated_title = db.Column(Text, nullable=True)
    translated_body = db.Column(Text, nullable=True)
    translator_note = db.Column(Text, nullable=True)  # Claude 가 남기는 문화 컨텍스트/각색 메모(검수용)
    published_post_id = db.Column(BigInteger, nullable=True)  # 발행된 en 글 id
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = db.Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    __table_args__ = (
        UniqueConstraint("source_post_id", name="uq_kstory_source"),
    )
