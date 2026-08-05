"""인증 API — 이번 단계 완전 구현.

POST /auth/social         : provider 신원확인 → users upsert → 자체 JWT 발급 (앱 네이티브)
POST /auth/signup         : 이메일 간편가입 (이메일+비밀번호)
POST /auth/login          : 이메일 로그인
GET  /auth/kakao/login    : 웹 카카오 OAuth 시작 → 카카오 authorize 로 리다이렉트
GET  /auth/kakao/callback : 카카오 code→token 교환 → upsert → 웹앱으로 #token 전달
GET  /me                  : JWT 검증 → 유저 + 상태칩 + (커플)요약
"""
import random
import re
from urllib.parse import urlencode, urlsplit

from werkzeug.security import check_password_hash, generate_password_hash

from flask import Blueprint, current_app, g, jsonify, redirect, request, url_for
from sqlalchemy import select

from ..auth import (
    SocialAuthError,
    exchange_kakao_code,
    issue_token,
    login_required,
    resolve_social_identity,
)
from ..extensions import db
from ..models import Couple, User
from ..models.enums import RELATIONSHIP_STATUSES

bp = Blueprint("auth", __name__)


# 아바타 이름 — 앱 app/src/avatars/index.ts AVATAR_NAMES 와 동기 유지
AVATAR_NAMES = {
    1: "하트토끼", 2: "새침냥이", 3: "곰돌이", 4: "병아리", 5: "멍뭉이", 6: "여우",
    7: "햄찌", 8: "펭귄", 9: "개구리", 10: "판다", 11: "오리", 12: "꿀꿀이",
}

# 연애 감성 수식어 — 아바타 이름과 조합해 랜덤 닉네임 생성 (예: 불안한곰돌이, 애정가득펭귄)
NICK_ADJECTIVES = (
    "불안한", "애정가득", "설레는", "두근두근", "시크한", "다정한",
    "츤데레", "금사빠", "짝사랑중", "철벽인", "순정파", "낭만적인",
    "소심한", "직진하는", "밀당고수", "눈치보는", "사랑꾼", "새침한",
    "무뚝뚝한", "질투많은", "호기심많은", "수줍은", "당당한", "엉뚱한",
)


def _generate_nickname(avatar_no: int) -> str:
    """수식어+아바타 이름 랜덤 닉네임 (프로필에서 변경 가능). 예: 애정가득곰돌이."""
    animal = AVATAR_NAMES.get(avatar_no, "하트토끼")
    for _ in range(20):
        candidate = f"{random.choice(NICK_ADJECTIVES)}{animal}"
        if not db.session.scalar(select(User.id).where(User.nickname == candidate)):
            return candidate
    # 조합 소진 시 숫자 접미사
    for _ in range(20):
        candidate = f"{random.choice(NICK_ADJECTIVES)}{animal}{random.randint(2, 999)}"
        if not db.session.scalar(select(User.id).where(User.nickname == candidate)):
            return candidate
    return f"{animal}{random.randint(100000, 99999999)}"


def _social_email() -> str | None:
    """소셜 로그인에서 동의받은 계정 이메일 (없으면 None). CS·계정 안내용."""
    email = (getattr(g, "social_email", None) or "").strip()
    return email[:255] or None


def signup_lang(data: dict) -> str:
    """가입 요청의 device locale → 언어권('ko'|'en'). ko 로 시작하면 ko, 그 외 en.
    locale 미제공(구버전 클라)이면 기본 'ko'(기존 한국 유저 무변경)."""
    loc = (data.get("locale") or "").strip().lower()
    if not loc:
        return "ko"
    return "ko" if loc.startswith("ko") else "en"


def login_or_create(provider: str, social_id: str, lang: str = "ko") -> tuple[User, bool]:
    """(provider, social_id) 로 유저 조회, 없으면 생성. (user, created) 반환.
    lang 은 신규 생성 시에만 적용(기존 유저 언어권 무변경)."""
    # dev provider 는 내부적으로 "dev:<id>" 형태이므로 저장 provider 는 'dev'
    store_provider = "dev" if provider == "dev" else provider

    user = db.session.scalar(
        select(User).where(
            User.social_provider == store_provider,
            User.social_id == social_id,
        )
    )
    email = _social_email()
    if user is not None:
        # 카카오계정 이메일 변경 시 최신값 유지
        if email and user.email != email:
            user.email = email
            db.session.commit()
        return user, False

    avatar_no = random.randint(1, 12)  # 아바타 랜덤 배정 — 닉네임도 이 캐릭터로 생성
    user = User(
        social_provider=store_provider,
        social_id=social_id,
        nickname=_generate_nickname(avatar_no),
        relationship_status="single",
        email=email,
        avatar_no=avatar_no,
        lang=lang,
    )
    db.session.add(user)
    db.session.commit()
    return user, True


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

    user, created = login_or_create(provider, social_id, lang=signup_lang(data))
    token_out = issue_token(user.id)
    return jsonify({"token": token_out, "user": user.to_dict(), "is_new": created}), 200


# ---- 이메일 간편가입/로그인 ------------------------------------------------------
EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")


def _clean_email(raw) -> str | None:
    email = (raw or "").strip().lower()
    return email if email and len(email) <= 255 and EMAIL_RE.match(email) else None


@bp.post("/auth/signup")
def email_signup():
    """이메일 간편가입 — 이메일+비밀번호(8자+)만으로 가입. 닉네임은 자동 생성."""
    data = request.get_json(silent=True) or {}
    email = _clean_email(data.get("email"))
    password = data.get("password") or ""

    if not email:
        return jsonify({"error": "invalid_email", "message": "올바른 이메일을 입력해주세요."}), 400
    if len(password) < 8:
        return jsonify({"error": "password_too_short", "message": "비밀번호는 8자 이상이어야 해요."}), 400

    exists = db.session.scalar(
        select(User.id).where(User.social_provider == "email", User.social_id == email)
    )
    if exists:
        return jsonify({"error": "email_taken", "message": "이미 가입된 이메일이에요. 로그인해주세요."}), 409

    avatar_no = random.randint(1, 12)
    user = User(
        social_provider="email",
        social_id=email,
        email=email,
        password_hash=generate_password_hash(password),
        nickname=_generate_nickname(avatar_no),
        relationship_status="single",
        avatar_no=avatar_no,
        lang=signup_lang(data),
    )
    db.session.add(user)
    db.session.commit()

    return jsonify({"token": issue_token(user.id), "user": user.to_dict(), "is_new": True}), 200


@bp.post("/auth/login")
def email_login():
    """이메일 로그인."""
    data = request.get_json(silent=True) or {}
    email = _clean_email(data.get("email"))
    password = data.get("password") or ""

    if not email or not password:
        return jsonify({"error": "invalid_credentials", "message": "이메일과 비밀번호를 입력해주세요."}), 400

    user = db.session.scalar(
        select(User).where(User.social_provider == "email", User.social_id == email)
    )
    if user is None or user.is_deleted or not user.password_hash or not check_password_hash(user.password_hash, password):
        return jsonify({"error": "invalid_credentials", "message": "이메일 또는 비밀번호가 맞지 않아요."}), 401

    return jsonify({"token": issue_token(user.id), "user": user.to_dict(), "is_new": False}), 200


# ---- 웹 카카오 OAuth (서버측 리다이렉트 플로우) ---------------------------------
KAKAO_AUTHORIZE_URL = "https://kauth.kakao.com/oauth/authorize"


def _allowed_return_origins() -> set[str]:
    """웹앱 복귀 URL 로 허용할 오리진 집합 (WEB_BASE_URL + CORS_ORIGINS)."""
    origins = set()
    web = current_app.config.get("WEB_BASE_URL") or ""
    if web:
        s = urlsplit(web)
        if s.scheme and s.netloc:
            origins.add(f"{s.scheme}://{s.netloc}")
    cors = current_app.config.get("CORS_ORIGINS", "") or ""
    for o in cors.split(","):
        o = o.strip()
        if o and o != "*":
            s = urlsplit(o)
            if s.scheme and s.netloc:
                origins.add(f"{s.scheme}://{s.netloc}")
    return origins


def _safe_return_url(url: str | None) -> str:
    """화이트리스트 오리진의 URL 만 허용, 아니면 WEB_BASE_URL 로 폴백."""
    fallback = current_app.config.get("WEB_BASE_URL") or "/"
    if not url:
        return fallback
    s = urlsplit(url)
    if not s.scheme or not s.netloc:
        return fallback
    origin = f"{s.scheme}://{s.netloc}"
    return url if origin in _allowed_return_origins() else fallback


def _state_secret() -> str:
    return current_app.config["JWT_SECRET"]


def _encode_state(return_url: str) -> str:
    import jwt as pyjwt
    from datetime import datetime, timedelta, timezone

    now = datetime.now(timezone.utc)
    return pyjwt.encode(
        {"return": return_url, "exp": now + timedelta(minutes=10)},
        _state_secret(),
        algorithm="HS256",
    )


def _decode_state(state: str | None) -> str | None:
    import jwt as pyjwt

    if not state:
        return None
    try:
        payload = pyjwt.decode(state, _state_secret(), algorithms=["HS256"])
    except pyjwt.PyJWTError:
        return None
    return payload.get("return")


@bp.get("/auth/kakao/login")
def kakao_web_login():
    if not current_app.config.get("KAKAO_REST_API_KEY"):
        return jsonify({"error": "kakao_not_configured"}), 503

    return_url = _safe_return_url(request.args.get("return"))
    redirect_uri = url_for("auth.kakao_web_callback", _external=True)
    params = {
        "client_id": current_app.config["KAKAO_REST_API_KEY"],
        "redirect_uri": redirect_uri,
        "response_type": "code",
        "state": _encode_state(return_url),
    }
    return redirect(f"{KAKAO_AUTHORIZE_URL}?{urlencode(params)}")


@bp.get("/auth/kakao/callback")
def kakao_web_callback():
    return_url = _decode_state(request.args.get("state"))
    if not return_url:
        return jsonify({"error": "invalid_state"}), 400

    if request.args.get("error"):
        # 사용자가 동의 취소 등 — 웹앱으로 에러 표시하며 복귀
        return redirect(f"{return_url}#kakao_error={request.args.get('error')}")

    code = request.args.get("code")
    if not code:
        return jsonify({"error": "code_required"}), 400

    redirect_uri = url_for("auth.kakao_web_callback", _external=True)
    try:
        access_token = exchange_kakao_code(code, redirect_uri)
        social_id = resolve_social_identity("kakao", access_token)
    except SocialAuthError:
        return redirect(f"{return_url}#kakao_error=auth_failed")

    user, _ = login_or_create("kakao", social_id)
    app_token = issue_token(user.id)
    # JWT 는 fragment 로 전달 → 서버 로그·Referer 에 노출되지 않음
    return redirect(f"{return_url}#token={app_token}")


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
            if len(nick) > 30:
                return jsonify({"error": "nickname_too_long"}), 400
            if db.session.scalar(select(User.id).where(User.nickname == nick, User.id != user.id)):
                return jsonify({"error": "nickname_taken"}), 409
            user.nickname = nick
    if "avatar_no" in data:
        try:
            n = int(data["avatar_no"])
        except (TypeError, ValueError):
            n = 0
        if 1 <= n <= 12:
            user.avatar_no = n
    if "lang" in data:
        lang = (data["lang"] or "").strip().lower()
        if lang not in ("ko", "en"):
            return jsonify({"error": "invalid_lang"}), 400
        user.lang = lang

    db.session.commit()
    return jsonify(_me_payload(user)), 200


@bp.delete("/me")
@login_required
def delete_me():
    """회원 탈퇴 — 개인정보 익명화 + 재로그인 차단."""
    from ..services.account import delete_account

    delete_account(g.user)
    return jsonify({"ok": True}), 200


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
