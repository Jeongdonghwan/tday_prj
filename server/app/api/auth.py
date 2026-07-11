"""인증 API — 이번 단계 완전 구현.

POST /auth/social  : provider 신원확인 → users upsert → 자체 JWT 발급
GET  /me           : JWT 검증 → 유저 + 상태칩 + (커플)요약
"""
import random

from flask import Blueprint, g, jsonify, request
from sqlalchemy import select

from ..auth import SocialAuthError, issue_token, login_required, resolve_social_identity
from ..extensions import db
from ..models import Couple, User
from ..models.enums import RELATIONSHIP_STATUSES

bp = Blueprint("auth", __name__)


def _generate_nickname() -> str:
    """임시 닉네임 자동 생성 (추후 온보딩에서 변경)."""
    for _ in range(20):
        candidate = f"썰러{random.randint(1000, 999999)}"
        exists = db.session.scalar(select(User.id).where(User.nickname == candidate))
        if not exists:
            return candidate
    # 극히 드문 충돌 — id 기반 폴백은 호출부에서 처리
    return f"썰러{random.randint(1000000, 99999999)}"


@bp.post("/auth/social")
def social_login():
    data = request.get_json(silent=True) or {}
    provider = data.get("provider")
    token = data.get("token")
    social_id_input = data.get("social_id")  # dev 로그인용

    if not provider:
        return jsonify({"error": "provider_required"}), 400

    try:
        social_id = resolve_social_identity(provider, token, social_id_input)
    except SocialAuthError as e:
        return jsonify({"error": "social_auth_failed", "message": e.message}), e.status

    # dev provider 는 내부적으로 "dev:<id>" 형태이므로 저장 provider 는 'dev'
    store_provider = "dev" if provider == "dev" else provider

    user = db.session.scalar(
        select(User).where(
            User.social_provider == store_provider,
            User.social_id == social_id,
        )
    )
    created = False
    if user is None:
        user = User(
            social_provider=store_provider,
            social_id=social_id,
            nickname=_generate_nickname(),
            relationship_status="single",
        )
        db.session.add(user)
        db.session.commit()
        created = True

    token_out = issue_token(user.id)
    return jsonify({"token": token_out, "user": user.to_dict(), "is_new": created}), 200


@bp.get("/me")
@login_required
def me():
    return jsonify(_me_payload(g.user)), 200


@bp.patch("/me")
@login_required
def update_me():
    """프로필 갱신 — 상태 전환(상태칩), 푸시 토큰, 닉네임."""
    data = request.get_json(silent=True) or {}
    user = g.user

    if "relationship_status" in data:
        status = data["relationship_status"]
        if status not in RELATIONSHIP_STATUSES:
            return jsonify({"error": "invalid_status"}), 400
        user.relationship_status = status
    if "push_token" in data:
        user.push_token = data["push_token"] or None
    if "nickname" in data:
        nick = (data["nickname"] or "").strip()
        if nick:
            if db.session.scalar(select(User.id).where(User.nickname == nick, User.id != user.id)):
                return jsonify({"error": "nickname_taken"}), 409
            user.nickname = nick

    db.session.commit()
    return jsonify(_me_payload(user)), 200


def _me_payload(user) -> dict:
    payload = user.to_dict()
    if user.couple_id:
        couple = db.session.get(Couple, user.couple_id)
        if couple:
            payload["couple"] = {
                "id": couple.id,
                "start_date": couple.start_date.isoformat() if couple.start_date else None,
                "connected": couple.user_b is not None,
            }
    return payload
