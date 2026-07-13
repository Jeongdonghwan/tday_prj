"""광고 슬롯 — 포지션별 활성 광고. 활성 없으면 앱이 아무것도 안 그림."""
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, DateTime, Enum, Index, Integer, String

from ..extensions import db
from .enums import AD_POSITIONS


class AdSlot(db.Model):
    __tablename__ = "ad_slots"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    position = db.Column(Enum(*AD_POSITIONS, name="ad_position"), nullable=False)
    image = db.Column(String(300), nullable=False)      # 광고 이미지 URL (관리자 입력)
    link_url = db.Column(String(500), nullable=False)    # 클릭 시 아웃링크
    starts_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
    ends_at = db.Column(DateTime, nullable=True)          # null = 무기한
    is_active = db.Column(Boolean, nullable=False, default=True)
    impressions = db.Column(Integer, nullable=False, default=0)
    clicks = db.Column(Integer, nullable=False, default=0)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    __table_args__ = (
        Index("idx_ad_position_active", "position", "is_active"),
    )
