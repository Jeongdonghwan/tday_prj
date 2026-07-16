"""소셜 provider 신원 확인.

- dev   : 키 없이 인증 경로 E2E 테스트 (DEV_LOGIN_ENABLED=true 일 때만)
- kakao : access token 으로 카카오 사용자 ID 조회 (골격 — 키 확보 후 활성)
- apple : identity token(JWT) 검증으로 sub 추출 (골격 — 키 확보 후 활성)

반환: provider 안에서 유일한 social_id(str). 실패 시 SocialAuthError.
"""
import jwt
import requests
from flask import current_app, g

APPLE_ISSUER = "https://appleid.apple.com"
APPLE_KEYS_URL = "https://appleid.apple.com/auth/keys"
# JWKS 클라이언트는 공개키를 캐시하므로 모듈 레벨에서 1회 생성 (요청마다 재조회 방지).
_apple_jwks = jwt.PyJWKClient(APPLE_KEYS_URL)


class SocialAuthError(Exception):
    def __init__(self, message: str, status: int = 401):
        super().__init__(message)
        self.message = message
        self.status = status


def resolve_social_identity(provider: str, token: str | None, social_id: str | None = None) -> str:
    if provider == "dev":
        return _resolve_dev(social_id)
    if provider == "kakao":
        return _resolve_kakao(token)
    if provider == "apple":
        return _resolve_apple(token)
    raise SocialAuthError(f"지원하지 않는 provider: {provider}", status=400)


def _resolve_dev(social_id: str | None) -> str:
    if not current_app.config.get("DEV_LOGIN_ENABLED"):
        raise SocialAuthError("dev 로그인이 비활성화되어 있습니다.", status=403)
    if not social_id:
        raise SocialAuthError("dev 로그인은 social_id 가 필요합니다.", status=400)
    return f"dev:{social_id}"


def _resolve_kakao(token: str | None) -> str:
    if not current_app.config.get("KAKAO_REST_API_KEY"):
        raise SocialAuthError("카카오 로그인이 아직 설정되지 않았습니다.", status=503)
    if not token:
        raise SocialAuthError("카카오 access token 이 필요합니다.", status=400)
    # 카카오 사용자 정보 조회 — access token 유효성 확인 겸 고유 ID 획득
    resp = requests.get(
        "https://kapi.kakao.com/v2/user/me",
        headers={"Authorization": f"Bearer {token}"},
        timeout=5,
    )
    if resp.status_code != 200:
        raise SocialAuthError("카카오 토큰 검증 실패", status=401)
    payload = resp.json()
    kakao_id = payload.get("id")
    if kakao_id is None:
        raise SocialAuthError("카카오 사용자 ID 를 가져오지 못했습니다.", status=401)

    # 카카오계정 이메일(동의 시)만 수집 — 닉네임은 서비스 자동생성 사용(카카오 닉네임은 실명인 경우가 많음)
    account = payload.get("kakao_account") or {}
    if account.get("email"):
        g.social_email = str(account["email"])

    return str(kakao_id)


def exchange_kakao_code(code: str, redirect_uri: str) -> str:
    """웹 OAuth: 인가 코드를 access token 으로 교환 (서버측, REST 키 사용).

    카카오 Redirect URI 는 http/https 만 허용하므로 웹 로그인은 서버 콜백에서 교환한다.
    반환: access_token. 실패 시 SocialAuthError.
    """
    rest_key = current_app.config.get("KAKAO_REST_API_KEY")
    if not rest_key:
        raise SocialAuthError("카카오 로그인이 아직 설정되지 않았습니다.", status=503)

    data = {
        "grant_type": "authorization_code",
        "client_id": rest_key,
        "redirect_uri": redirect_uri,
        "code": code,
    }
    secret = current_app.config.get("KAKAO_CLIENT_SECRET")
    if secret:
        data["client_secret"] = secret

    resp = requests.post(
        "https://kauth.kakao.com/oauth/token",
        data=data,
        headers={"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"},
        timeout=5,
    )
    if resp.status_code != 200:
        raise SocialAuthError("카카오 인가 코드 교환 실패", status=401)
    access_token = resp.json().get("access_token")
    if not access_token:
        raise SocialAuthError("카카오 access token 을 받지 못했습니다.", status=401)
    return access_token


def _resolve_apple(token: str | None) -> str:
    """Apple identity token(JWT) 을 Apple 공개키로 검증하고 sub(고유 ID) 반환.

    - 서명: JWKS(appleid.apple.com/auth/keys)의 kid 매칭 공개키(RS256)
    - aud == APPLE_CLIENT_ID (서비스ID/번들ID), iss == https://appleid.apple.com, exp 유효
    """
    client_id = current_app.config.get("APPLE_CLIENT_ID")
    if not client_id:
        raise SocialAuthError("애플 로그인이 아직 설정되지 않았습니다.", status=503)
    if not token:
        raise SocialAuthError("애플 identity token 이 필요합니다.", status=400)

    try:
        signing_key = _apple_jwks.get_signing_key_from_jwt(token)
        claims = jwt.decode(
            token,
            signing_key.key,
            algorithms=["RS256"],
            audience=client_id,
            issuer=APPLE_ISSUER,
        )
    except jwt.PyJWTError as e:
        raise SocialAuthError(f"애플 토큰 검증 실패: {e}", status=401)

    sub = claims.get("sub")
    if not sub:
        raise SocialAuthError("애플 사용자 ID 를 가져오지 못했습니다.", status=401)

    if claims.get("email"):
        g.social_email = str(claims["email"])

    return str(sub)
