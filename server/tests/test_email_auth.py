"""이메일 간편가입/로그인 (/auth/signup, /auth/login)."""


def _signup(client, email="a@b.com", password="password1"):
    return client.post("/auth/signup", json={"email": email, "password": password})


def test_signup_creates_user_with_generated_nickname(client):
    r = _signup(client)
    assert r.status_code == 200
    d = r.get_json()
    assert d["is_new"] is True and d["token"]
    assert d["user"]["email"] == "a@b.com"
    # 수식어+아바타 랜덤 닉네임, 아바타 번호와 캐릭터 일치
    from app.api.auth import AVATAR_NAMES
    assert AVATAR_NAMES[d["user"]["avatar_no"]] in d["user"]["nickname"]


def test_signup_rejects_bad_email_and_short_password(client):
    assert _signup(client, email="not-an-email").status_code == 400
    assert _signup(client, password="short").status_code == 400


def test_signup_duplicate_email_409(client):
    _signup(client)
    assert _signup(client).status_code == 409


def test_signup_email_is_normalized(client):
    """대소문자·공백 정규화 — 같은 이메일로 중복 가입 불가."""
    _signup(client, email="Foo@Bar.com")
    assert _signup(client, email="  foo@bar.com ").status_code == 409


def test_login_success_and_me(client, bearer):
    _signup(client)
    r = client.post("/auth/login", json={"email": "a@b.com", "password": "password1"})
    assert r.status_code == 200
    d = r.get_json()
    assert d["is_new"] is False
    assert client.get("/me", headers=bearer(d["token"])).status_code == 200


def test_login_wrong_password_401(client):
    _signup(client)
    r = client.post("/auth/login", json={"email": "a@b.com", "password": "wrongpass1"})
    assert r.status_code == 401


def test_login_unknown_email_401(client):
    r = client.post("/auth/login", json={"email": "ghost@b.com", "password": "password1"})
    assert r.status_code == 401


def test_deleted_account_cannot_login_but_can_resignup(client, bearer):
    """탈퇴 후 로그인 차단, 같은 이메일로 재가입은 가능(새 계정)."""
    first = _signup(client).get_json()
    client.delete("/me", headers=bearer(first["token"]))

    r = client.post("/auth/login", json={"email": "a@b.com", "password": "password1"})
    assert r.status_code == 401

    again = _signup(client)
    assert again.status_code == 200
    assert again.get_json()["user"]["id"] != first["user"]["id"]
