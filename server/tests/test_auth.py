"""auth API 회귀 테스트 (api/auth.py)."""


def test_dev_login_issues_token_and_creates_user(client):
    r = client.post("/auth/social", json={"provider": "dev", "social_id": "alice"})
    assert r.status_code == 200
    d = r.get_json()
    assert d["token"]
    assert d["is_new"] is True
    assert d["user"]["relationship_status"] == "single"
    assert d["user"]["status_label"] == "돌싱"


def test_dev_login_is_upsert(client):
    first = client.post("/auth/social", json={"provider": "dev", "social_id": "bob"}).get_json()
    second = client.post("/auth/social", json={"provider": "dev", "social_id": "bob"}).get_json()
    assert second["is_new"] is False
    assert first["user"]["id"] == second["user"]["id"]


def test_me_requires_token(client):
    assert client.get("/me").status_code == 401


def test_me_returns_user(client, token, bearer):
    r = client.get("/me", headers=bearer(token))
    assert r.status_code == 200
    assert r.get_json()["nickname"]


def test_kakao_without_key_unavailable(client, app, monkeypatch):
    monkeypatch.setitem(app.config, "KAKAO_REST_API_KEY", "")
    r = client.post("/auth/social", json={"provider": "kakao", "token": "x"})
    assert r.status_code == 503


def _mock_kakao_me(monkeypatch, app, payload):
    """kapi user/me 응답 모킹 (카카오계정 이메일 수집 경로)."""
    monkeypatch.setitem(app.config, "KAKAO_REST_API_KEY", "k")

    class _Resp:
        status_code = 200

        def json(self):
            return payload

    monkeypatch.setattr("app.auth.social.requests.get", lambda *a, **kw: _Resp())


def test_kakao_signup_stores_email_and_generates_nickname(client, app, monkeypatch):
    """카카오 가입: 이메일 저장, 닉네임은 카카오 것이 아닌 자동 생성."""
    _mock_kakao_me(monkeypatch, app, {
        "id": 777001,
        "kakao_account": {"email": "yeoni@kakao.com", "profile": {"nickname": "실명김"}},
    })
    r = client.post("/auth/social", json={"provider": "kakao", "token": "t"})
    assert r.status_code == 200
    u = r.get_json()["user"]
    assert u["email"] == "yeoni@kakao.com"
    # 카카오 닉네임(실명 가능성) 미사용 — 수식어+아바타 랜덤 닉네임
    from app.api.auth import AVATAR_NAMES
    assert u["nickname"] != "실명김"
    assert any(name in u["nickname"] for name in AVATAR_NAMES.values())


def test_kakao_login_refreshes_changed_email(client, app, monkeypatch):
    """기존 회원 재로그인 시 카카오계정 이메일 변경분 반영."""
    _mock_kakao_me(monkeypatch, app, {"id": 777002, "kakao_account": {"email": "old@kakao.com"}})
    client.post("/auth/social", json={"provider": "kakao", "token": "t"})

    _mock_kakao_me(monkeypatch, app, {"id": 777002, "kakao_account": {"email": "new@kakao.com"}})
    r = client.post("/auth/social", json={"provider": "kakao", "token": "t"})
    assert r.get_json()["is_new"] is False
    assert r.get_json()["user"]["email"] == "new@kakao.com"


def test_kakao_signup_without_email_ok(client, app, monkeypatch):
    """이메일 미동의여도 가입은 정상 (email=None)."""
    _mock_kakao_me(monkeypatch, app, {"id": 777003})
    r = client.post("/auth/social", json={"provider": "kakao", "token": "t"})
    assert r.status_code == 200
    assert r.get_json()["user"]["email"] is None


def test_delete_me_clears_email(client, app, monkeypatch, bearer):
    """탈퇴 시 이메일도 익명화(삭제)."""
    _mock_kakao_me(monkeypatch, app, {"id": 777005, "kakao_account": {"email": "bye@kakao.com"}})
    d = client.post("/auth/social", json={"provider": "kakao", "token": "t"}).get_json()
    assert client.delete("/me", headers=bearer(d["token"])).status_code == 200

    from app.models import User
    from app.extensions import db
    with app.app_context():
        assert db.session.get(User, d["user"]["id"]).email is None


def test_patch_me_changes_status_and_push_token(client, token, bearer):
    r = client.patch("/me", json={"relationship_status": "couple", "push_token": "ExponentPushToken[t]"}, headers=bearer(token))
    assert r.status_code == 200
    assert r.get_json()["relationship_status"] == "couple"
    assert r.get_json()["status_label"] == "커플"


def test_patch_me_rejects_duplicate_nickname(client, register, bearer):
    t1, _ = register("u1")
    t2, _ = register("u2")
    nick = client.get("/me", headers=bearer(t1)).get_json()["nickname"]
    r = client.patch("/me", json={"nickname": nick}, headers=bearer(t2))
    assert r.status_code == 409


def test_patch_me_rejects_invalid_status(client, token, bearer):
    r = client.patch("/me", json={"relationship_status": "bogus"}, headers=bearer(token))
    assert r.status_code == 400


def test_patch_me_changes_nickname_and_avatar(client, token, bearer):
    r = client.patch("/me", json={"nickname": "새닉네임", "avatar_no": 7}, headers=bearer(token))
    assert r.status_code == 200
    body = r.get_json()
    assert body["nickname"] == "새닉네임" and body["avatar_no"] == 7


def test_delete_me_requires_token(client):
    assert client.delete("/me").status_code == 401


def test_delete_me_anonymizes_and_blocks_relogin(client, app, register, bearer):
    tok, uid = register("quitter")
    assert client.delete("/me", headers=bearer(tok)).status_code == 200

    # 탈퇴 후 같은 토큰으로는 접근 불가 (user_not_found)
    assert client.get("/me", headers=bearer(tok)).status_code == 401

    # 개인정보 익명화 확인
    from app.models import User
    from app.extensions import db
    with app.app_context():
        u = db.session.get(User, uid)
        assert u.is_deleted is True
        assert u.social_id == f"deleted:{uid}"
        assert u.push_token is None


def test_delete_me_relogin_creates_fresh_account(client, bearer):
    """탈퇴한 소셜 계정으로 재로그인하면 새 유저로 분리된다."""
    first = client.post("/auth/social", json={"provider": "dev", "social_id": "comeback"}).get_json()
    client.delete("/me", headers=bearer(first["token"]))
    second = client.post("/auth/social", json={"provider": "dev", "social_id": "comeback"}).get_json()
    assert second["is_new"] is True
    assert second["user"]["id"] != first["user"]["id"]


def test_delete_me_unlinks_couple(client, app, register, bearer):
    """커플 연결 상태에서 탈퇴하면 상대방 couple_id 도 해제된다."""
    ta, ua = register("lover_a")
    tb, ub = register("lover_b")

    from app.models import Couple, User
    from app.extensions import db
    with app.app_context():
        couple = Couple(user_a=ua, user_b=ub, invite_code="LOVE01")
        db.session.add(couple)
        db.session.flush()
        db.session.get(User, ua).couple_id = couple.id
        db.session.get(User, ub).couple_id = couple.id
        db.session.commit()

    assert client.delete("/me", headers=bearer(ta)).status_code == 200
    with app.app_context():
        assert db.session.get(User, ub).couple_id is None
