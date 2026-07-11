from datetime import datetime

from sqlalchemy import BigInteger, DateTime, Enum, Index, String

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
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_social", "social_provider", "social_id"),
    )

    def status_label(self) -> str:
        return STATUS_LABELS.get(self.relationship_status, "")

    def to_dict(self) -> dict:
        return {
            "id": self.id,
            "nickname": self.nickname,
            "relationship_status": self.relationship_status,
            "status_label": self.status_label(),
            "couple_id": self.couple_id,
            "created_at": self.created_at.isoformat() if self.created_at else None,
        }
