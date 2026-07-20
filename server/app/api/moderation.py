"""신고/차단 API (스펙 §7, §10: 애플 심사 필수). 4단계 구현.

  POST   /reports   { target_type, target_id, reason }
  POST   /blocks    { blocked_user_id }
  GET    /blocks
  DELETE /blocks/{id}
"""
from flask import Blueprint, g, jsonify, request
from sqlalchemy import func, select

from ..auth import login_required
from ..extensions import db
from ..models import Block, Comment, Post, Report, User
from ..models.enums import REPORT_TARGETS

bp = Blueprint("moderation", __name__)

# 신고 누적 임계치 → 자동 가림 (스펙 §6 못박기)
BLIND_THRESHOLD = 5


@bp.post("/reports")
@login_required
def create_report():
    data = request.get_json(silent=True) or {}
    target_type = data.get("target_type")
    target_id = data.get("target_id")
    reason = (data.get("reason") or "").strip() or None

    if target_type not in REPORT_TARGETS or not target_id:
        return jsonify({"error": "invalid_target"}), 400

    db.session.add(
        Report(target_type=target_type, target_id=target_id, reporter_id=g.user.id, reason=reason)
    )
    db.session.flush()

    # 임계치 넘으면 자동 가림 (콘텐츠 대상)
    from ..models import IssueComment

    BLIND_MODELS = {"post": Post, "comment": Comment, "issue_comment": IssueComment}
    blinded = False
    if target_type in BLIND_MODELS:
        count = db.session.scalar(
            select(func.count(Report.id)).where(
                Report.target_type == target_type, Report.target_id == target_id
            )
        )
        if count and count >= BLIND_THRESHOLD:
            obj = db.session.get(BLIND_MODELS[target_type], target_id)
            if obj and not obj.is_blinded:
                obj.is_blinded = True
                blinded = True

    db.session.commit()
    return jsonify({"ok": True, "blinded": blinded}), 201


@bp.post("/blocks")
@login_required
def create_block():
    data = request.get_json(silent=True) or {}
    blocked_user_id = data.get("blocked_user_id")
    if not blocked_user_id:
        return jsonify({"error": "blocked_user_id_required"}), 400
    if blocked_user_id == g.user.id:
        return jsonify({"error": "cannot_block_self"}), 400
    if not db.session.get(User, blocked_user_id):
        return jsonify({"error": "user_not_found"}), 404

    exists = db.session.scalar(
        select(Block).where(Block.user_id == g.user.id, Block.blocked_user_id == blocked_user_id)
    )
    if not exists:
        db.session.add(Block(user_id=g.user.id, blocked_user_id=blocked_user_id))
        db.session.commit()
    return jsonify({"ok": True}), 201


@bp.get("/blocks")
@login_required
def list_blocks():
    rows = db.session.execute(
        select(Block.id, User.id, User.nickname)
        .join(User, User.id == Block.blocked_user_id)
        .where(Block.user_id == g.user.id)
        .order_by(Block.id.desc())
    ).all()
    items = [{"block_id": bid, "user_id": uid, "nickname": nick} for bid, uid, nick in rows]
    return jsonify({"items": items})


@bp.delete("/blocks/<int:block_id>")
@login_required
def delete_block(block_id: int):
    block = db.session.get(Block, block_id)
    if not block or block.user_id != g.user.id:
        return jsonify({"error": "not_found"}), 404
    db.session.delete(block)
    db.session.commit()
    return jsonify({"ok": True})
