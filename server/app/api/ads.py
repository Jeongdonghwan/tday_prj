"""광고 슬롯 API — 포지션별 활성 광고 조회(노출 카운트) + 클릭 카운트.

  GET  /ads?position=<pos>   현재 활성 광고 1건(없으면 null), impressions+1
  POST /ads/<id>/click       clicks+1
"""
from datetime import datetime

from flask import Blueprint, jsonify, request
from sqlalchemy import select

from ..extensions import db
from ..models import AdSlot
from ..models.enums import AD_POSITIONS

bp = Blueprint("ads", __name__)


@bp.get("/ads")
def active_ad():
    position = request.args.get("position")
    if position not in AD_POSITIONS:
        return jsonify({"error": "invalid_position"}), 400
    now = datetime.utcnow()
    ad = db.session.scalar(
        select(AdSlot)
        .where(
            AdSlot.position == position,
            AdSlot.is_active.is_(True),
            AdSlot.starts_at <= now,
            (AdSlot.ends_at.is_(None)) | (AdSlot.ends_at > now),
        )
        .order_by(AdSlot.created_at.desc())
    )
    if not ad:
        return jsonify({"ad": None})
    ad.impressions += 1
    db.session.commit()
    return jsonify({"ad": {"id": ad.id, "image": ad.image, "link_url": ad.link_url}})


@bp.post("/ads/<int:ad_id>/click")
def click_ad(ad_id: int):
    ad = db.session.get(AdSlot, ad_id)
    if not ad:
        return jsonify({"error": "not_found"}), 404
    ad.clicks += 1
    db.session.commit()
    return jsonify({"ok": True})
