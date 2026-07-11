from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, Index, SmallInteger, String

from ..extensions import db
from .enums import RELATIONSHIP_STATUSES, SOCIAL_PROVIDERS, STATUS_LABELS


class User(db.Model):
    __tablename__ = "users"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    nickname = db.Column(String(30), unique=True, nullable=False)
    social_provider = db.Column(Enum(*SOCIAL_PROVIDERS, name="social_provider"), nullable=False)
    social_id = db.Column(String(128), nullable=False)
    relationship_status = db.Column(
        Enum(*RELATIONSHIP_STATUSES, name="relationship_status"),
        nullable=False,
        default="single",
    )
    # 스펙 §6: couple_id 는 FK 제약 미선언(BIGINT NULL) — users<->couples 순환 FK 회피
    couple_id = db.Column(BigInteger, nullable=True)
    push_token = db.Column(String(255), nullable=True)  # Expo Push
    avatar_no = db.Column(SmallInteger, nullable=True)  # 기본 아바타 1..12 (DESIGN_UPDATE §1)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_social", "social_provider", "social_id"),
    )

    def status_label(self) -> str:
        return STATUS_LABELS.get(self.relationship_status, "")

    def avatar(self) -> int:
        """avatar_no (없으면 id 기반 폴백, DECISIONS #2)."""
        return self.avatar_no or ((self.id % 12) + 1 if self.id else 1)

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "nickname": self.nickname,
            "relationship_status": self.relationship_status,
            "status_label": self.status_label(),
            "couple_id": self.couple_id,
            "avatar_no": self.avatar(),
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
