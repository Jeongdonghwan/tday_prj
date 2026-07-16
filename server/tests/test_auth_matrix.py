"""인증 매트릭스 — 모든 보호 라우트가 무효/부재/만료/삭제유저 토큰에 401 을 반환하는지.

기존 스위트는 대부분 '토큰 없음'만 spot-check → jwt.py 의 invalid/expired/deleted 분기(=대부분의
401 경로)가 미커버였다. @login_required 는 핸들러보다 먼저 실행되므로 라우트의 리소스 존재 여부와
무관하게(존재하지 않는 id 여도) 401 이 먼저 나와야 한다.
"""
import pytest

# (method, path) — @login_required 가 걸린 대표 보호 라우트. id 는 인증이 먼저 막으므로 아무 값이나.
PROTECTED = [
    ("POST", "/posts"),
    ("DELETE", "/posts/1"),
    ("POST", "/posts/1/vote"),
    ("POST", "/posts/1/like"),
    ("POST", "/posts/1/comments"),
    ("POST", "/comments/1/like"),
    ("POST", "/issues/1/vote"),
    ("POST", "/issues/1/comments"),
    ("GET", "/daily/today"),
    ("POST", "/daily/answer"),
    ("POST", "/daily-poll/vote"),
    ("GET", "/me"),
    ("PATCH", "/me"),
    ("GET", "/me/posts"),
    ("GET", "/me/comments"),
    ("POST", "/couple/invite"),
    ("POST", "/couple/join"),
    ("PATCH", "/couple/start-date"),
    ("GET", "/couple/dday"),
    ("GET", "/schedules"),
    ("POST", "/schedules"),
    ("DELETE", "/schedules/1"),
    ("POST", "/reports"),
    ("POST", "/blocks"),
    ("GET", "/blocks"),
    ("DELETE", "/blocks/1"),
    ("GET", "/notifications"),
    ("POST", "/uploads"),
    ("GET", "/me/test-badge"),
]


def _call(client, method, path, headers=None):
    fn = getattr(client, method.lower())
    if method in ("POST", "PATCH", "PUT"):
        return fn(path, json={}, headers=headers or {})
    return fn(path, headers=headers or {})


@pytest.mark.parametrize("method,path", PROTECTED)
def test_missing_token_401(client, method, path):
    assert _call(client, method, path).status_code == 401


@pytest.mark.parametrize("method,path", PROTECTED)
def test_invalid_token_401(client, method, path, bearer):
    r = _call(client, method, path, bearer("garbage.not.a.jwt"))
    assert r.status_code == 401 and r.get_json()["error"] == "invalid_token"


@pytest.mark.parametrize("method,path", PROTECTED)
def test_expired_token_401(client, method, path, bearer, make_token):
    r = _call(client, method, path, bearer(make_token(1, expired=True)))
    assert r.status_code == 401 and r.get_json()["error"] == "token_expired"


@pytest.mark.parametrize("method,path", PROTECTED)
def test_deleted_user_token_401(client, method, path, bearer, deleted_user_token):
    r = _call(client, method, path, bearer(deleted_user_token))
    assert r.status_code == 401 and r.get_json()["error"] == "user_not_found"


# 게스트(비로그인) 공개 읽기 — 웹 미로그인 열람 허용 라우트는 200 이어야 한다
import pytest as _pytest


@_pytest.mark.parametrize("path", [
    "/issues/today", "/issues/archive", "/daily-poll/today",
    "/home/trending", "/tests", "/tests/promo",
])
def test_guest_readable_routes_200(client, path):
    assert client.get(path).status_code == 200
