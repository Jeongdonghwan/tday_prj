"""AI API (스펙 §7 `POST /ai/poll-suggest`). 5단계 옵션 기능."""
from flask import Blueprint, jsonify, request

from ..auth import login_required
from ..services.ai import AIUnavailable, suggest_poll

bp = Blueprint("ai", __name__)


@bp.post("/ai/poll-suggest")
@login_required
def poll_suggest():
    data = request.get_json(silent=True) or {}
    title = (data.get("title") or "").strip()
    if not title:
        return jsonify({"error": "title_required"}), 400
    try:
        result = suggest_poll(title, (data.get("body") or "").strip())
    except AIUnavailable as e:
        return jsonify({"error": "ai_unavailable", "message": str(e)}), 503
    return jsonify(result)
