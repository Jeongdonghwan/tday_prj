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


def test_kakao_without_key_unavailable(client):
    r = client.post("/auth/social", json={"provider": "kakao", "token": "x"})
    assert r.status_code == 503


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
