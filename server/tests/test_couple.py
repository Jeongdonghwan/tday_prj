"""couple API 회귀 테스트 (api/couple.py)."""


def test_invite_join_and_dday(client, register, bearer):
    a, _ = register("coupleA")
    b, _ = register("coupleB")

    code = client.post("/couple/invite", headers=bearer(a)).get_json()["invite_code"]
    assert len(code) == 6

    r = client.post("/couple/join", json={"code": code}, headers=bearer(b))
    assert r.status_code == 200
    assert r.get_json()["partner"]  # A 의 닉네임

    # 시작일 → D-day
    assert client.patch("/couple/start-date", json={"date": "2025-07-17"}, headers=bearer(a)).status_code == 200
    dd = client.get("/couple/dday", headers=bearer(b)).get_json()
    assert dd["connected"] and dd["days"] > 0 and dd["next"]["d_day"] >= 0


def test_invite_returns_existing_code(client, register, bearer):
    a, _ = register("a")
    first = client.post("/couple/invite", headers=bearer(a)).get_json()["invite_code"]
    second = client.post("/couple/invite", headers=bearer(a)).get_json()["invite_code"]
    assert first == second


def test_cannot_join_own_code(client, register, bearer):
    a, _ = register("a")
    code = client.post("/couple/invite", headers=bearer(a)).get_json()["invite_code"]
    assert client.post("/couple/join", json={"code": code}, headers=bearer(a)).status_code == 400


def test_cannot_join_full_couple(client, register, bearer):
    a, _ = register("a")
    b, _ = register("b")
    c, _ = register("c")
    code = client.post("/couple/invite", headers=bearer(a)).get_json()["invite_code"]
    client.post("/couple/join", json={"code": code}, headers=bearer(b))
    assert client.post("/couple/join", json={"code": code}, headers=bearer(c)).status_code == 409


def test_invalid_code(client, register, bearer):
    a, _ = register("a")
    assert client.post("/couple/join", json={"code": "ZZZZZZ"}, headers=bearer(a)).status_code == 404
