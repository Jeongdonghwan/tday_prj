"""소셜 provider 신원 확인.

- dev   : 키 없이 인증 경로 E2E 테스트 (DEV_LOGIN_ENABLED=true 일 때만)
- kakao : access token 으로 카카오 사용자 ID 조회 (골격 — 키 확보 후 활성)
- apple : identity token(JWT) 검증으로 sub 추출 (골격 — 키 확보 후 활성)

반환: provider 안에서 유일한 social_id(str). 실패 시 SocialAuthError.
"""
import requests
from flask import current_app


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
    kakao_id = resp.json().get("id")
    if kakao_id is None:
        raise SocialAuthError("카카오 사용자 ID 를 가져오지 못했습니다.", status=401)
    return str(kakao_id)


def _resolve_apple(token: str | None) -> str:
    # TODO: Apple identity token(JWT) 을 Apple 공개키(https://appleid.apple.com/auth/keys)로 검증,
    #       aud == APPLE_CLIENT_ID, iss == https://appleid.apple.com 확인 후 sub 반환.
    #       (PyJWT + PyJWKClient 사용. 키 확보 후 구현.)
    if not current_app.config.get("APPLE_CLIENT_ID"):
        raise SocialAuthError("애플 로그인이 아직 설정되지 않았습니다.", status=503)
    raise SocialAuthError("애플 로그인 구현 예정", status=501)
