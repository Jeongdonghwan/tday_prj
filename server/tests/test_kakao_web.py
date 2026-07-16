"""웹 카카오 OAuth 서버측 리다이렉트 플로우 (/auth/kakao/login·/callback)."""
from urllib.parse import parse_qs, urlsplit

import jwt as pyjwt


def _login_state(client, app, monkeypatch, return_url):
    """login 엔드포인트를 호출해 유효한 state 를 얻는다."""
    monkeypatch.setitem(app.config, "KAKAO_REST_API_KEY", "restkey")
    r = client.get(f"/auth/kakao/login?return={return_url}")
    assert r.status_code == 302
    q = parse_qs(urlsplit(r.headers["Location"]).query)
    return q["state"][0]


def test_kakao_login_requires_key(client, app, monkeypatch):
    """REST 키 미설정이면 503."""
    monkeypatch.setitem(app.config, "KAKAO_REST_API_KEY", "")
    assert client.get("/auth/kakao/login").status_code == 503


def test_kakao_login_redirects_to_authorize(client, app, monkeypatch):
    monkeypatch.setitem(app.config, "KAKAO_REST_API_KEY", "restkey")
    r = client.get("/auth/kakao/login?return=http://127.0.0.1:5050/login")
    assert r.status_code == 302
    loc = r.headers["Location"]
    assert loc.startswith("https://kauth.kakao.com/oauth/authorize")
    q = parse_qs(urlsplit(loc).query)
    assert q["client_id"] == ["restkey"]
    assert q["response_type"] == ["code"]
    assert "callback" in q["redirect_uri"][0]
    assert q["state"]  # state 존재


def test_kakao_login_rejects_untrusted_return(client, app, monkeypatch):
    """허용되지 않은 return 오리진은 WEB_BASE_URL 로 폴백된다(state 안에)."""
    state = _login_state(client, app, monkeypatch, "http://evil.example.com/steal")
    payload = pyjwt.decode(state, app.config["JWT_SECRET"], algorithms=["HS256"])
    assert payload["return"] == app.config["WEB_BASE_URL"]


def test_kakao_callback_invalid_state(client):
    assert client.get("/auth/kakao/callback?code=x&state=forged").status_code == 400


def test_kakao_callback_code_required(client, app, monkeypatch):
    state = _login_state(client, app, monkeypatch, "http://127.0.0.1:5050/login")
    r = client.get(f"/auth/kakao/callback?state={state}")
    assert r.status_code == 400
    assert r.get_json()["error"] == "code_required"


def test_kakao_callback_success_issues_token(client, app, monkeypatch):
    state = _login_state(client, app, monkeypatch, "http://127.0.0.1:5050/login")
    monkeypatch.setattr("app.api.auth.exchange_kakao_code", lambda code, ru: "access-tok")
    monkeypatch.setattr("app.api.auth.resolve_social_identity", lambda p, t, s=None: "kakao-9999")

    r = client.get(f"/auth/kakao/callback?state={state}&code=authcode")
    assert r.status_code == 302
    loc = r.headers["Location"]
    assert loc.startswith("http://127.0.0.1:5050/login#token=")

    # 발급된 토큰으로 /me 접근 가능 → 유저 생성 확인
    token = loc.split("#token=", 1)[1]
    me = client.get("/me", headers={"Authorization": f"Bearer {token}"})
    assert me.status_code == 200


def test_kakao_callback_user_cancel(client, app, monkeypatch):
    """카카오가 error 를 돌려주면 웹앱으로 #kakao_error 표시하며 복귀."""
    state = _login_state(client, app, monkeypatch, "http://127.0.0.1:5050/login")
    r = client.get(f"/auth/kakao/callback?state={state}&error=access_denied")
    assert r.status_code == 302
    assert "#kakao_error=access_denied" in r.headers["Location"]
