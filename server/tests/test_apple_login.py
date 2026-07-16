"""애플 로그인 백엔드 (_resolve_apple) — JWKS/decode 모킹으로 검증 로직 테스트."""
import jwt
import pytest


def test_apple_without_client_id_unavailable(client):
    """APPLE_CLIENT_ID 미설정이면 503(비활성)."""
    r = client.post("/auth/social", json={"provider": "apple", "token": "x"})
    assert r.status_code == 503


def test_apple_requires_token(client, app, monkeypatch):
    monkeypatch.setitem(app.config, "APPLE_CLIENT_ID", "com.todaylove.app")
    r = client.post("/auth/social", json={"provider": "apple"})
    assert r.status_code == 400


def _mock_apple(monkeypatch, app, decode_result=None, decode_error=None):
    """JWKS 서명키 조회 + jwt.decode 를 모킹."""
    monkeypatch.setitem(app.config, "APPLE_CLIENT_ID", "com.todaylove.app")

    class _Key:
        key = "fake-public-key"

    monkeypatch.setattr(
        "app.auth.social._apple_jwks.get_signing_key_from_jwt",
        lambda _t: _Key(),
    )

    def _decode(*args, **kwargs):
        if decode_error:
            raise decode_error
        return decode_result

    monkeypatch.setattr("app.auth.social.jwt.decode", _decode)


def test_apple_valid_token_creates_user(client, app, monkeypatch):
    _mock_apple(monkeypatch, app, decode_result={"sub": "001234.apple.uid", "iss": "https://appleid.apple.com"})
    r = client.post("/auth/social", json={"provider": "apple", "token": "valid.jwt.token"})
    assert r.status_code == 200
    d = r.get_json()
    assert d["is_new"] is True
    assert d["token"]


def test_apple_upsert_same_sub(client, app, monkeypatch):
    _mock_apple(monkeypatch, app, decode_result={"sub": "same.uid"})
    first = client.post("/auth/social", json={"provider": "apple", "token": "t"}).get_json()
    second = client.post("/auth/social", json={"provider": "apple", "token": "t"}).get_json()
    assert second["is_new"] is False
    assert first["user"]["id"] == second["user"]["id"]


def test_apple_invalid_token_rejected(client, app, monkeypatch):
    _mock_apple(monkeypatch, app, decode_error=jwt.InvalidAudienceError("bad aud"))
    r = client.post("/auth/social", json={"provider": "apple", "token": "forged"})
    assert r.status_code == 401
