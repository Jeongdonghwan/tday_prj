"""자체 JWT 발급/검증 + @login_required 데코레이터."""
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import current_app, g, jsonify, request

from ..extensions import db
from ..models import User


def issue_token(user_id: int) -> str:
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(days=current_app.config["JWT_EXPIRES_DAYS"]),
    }
    return jwt.encode(payload, current_app.config["JWT_SECRET"], algorithm="HS256")


def decode_token(token: str) -> dict:
    return jwt.decode(token, current_app.config["JWT_SECRET"], algorithms=["HS256"])


def _bearer_token() -> str | None:
    header = request.headers.get("Authorization", "")
    if header.startswith("Bearer "):
        return header[7:].strip()
    return None


def current_user_optional():
    """토큰이 있으면 유저를, 없거나 무효면 None 을 반환 (비로그인 허용 엔드포인트용)."""
    token = _bearer_token()
    if not token:
        return None
    try:
        payload = decode_token(token)
    except jwt.PyJWTError:
        return None
    return db.session.get(User, int(payload["sub"]))


def login_required(fn):
    """요청의 Bearer JWT 를 검증하고 g.user 에 현재 유저를 채운다."""

    @wraps(fn)
    def wrapper(*args, **kwargs):
        token = _bearer_token()
        if not token:
            return jsonify({"error": "unauthorized", "message": "토큰이 없습니다."}), 401
        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return jsonify({"error": "token_expired"}), 401
        except jwt.PyJWTError:
            return jsonify({"error": "invalid_token"}), 401

        user = db.session.get(User, int(payload["sub"]))
        if user is None:
            return jsonify({"error": "user_not_found"}), 401
        g.user = user
        return fn(*args, **kwargs)

    return wrapper
