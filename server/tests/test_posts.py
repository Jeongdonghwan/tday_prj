"""posts API 회귀 테스트 (api/posts.py)."""


def _create(client, headers, **over):
    body = {"category": "free", "title": "제목", "body": "본문"}
    body.update(over)
    return client.post("/posts", json=body, headers=headers)


def test_create_plain_post(client, token, bearer):
    r = _create(client, bearer(token))
    assert r.status_code == 201
    d = r.get_json()
    assert d["is_poll"] is False
    assert d["author"]["status_label"] == "돌싱"


def test_create_poll_post(client, token, bearer):
    r = _create(client, bearer(token), category="love", is_poll=True, poll={"a": "짜장", "b": "짬뽕"})
    assert r.status_code == 201
    poll = r.get_json()["poll"]
    assert poll["a_label"] == "짜장" and poll["total"] == 0 and poll["a_pct"] == 50


def test_poll_requires_both_options(client, token, bearer):
    r = _create(client, bearer(token), is_poll=True, poll={"a": "", "b": ""})
    assert r.status_code == 400


def test_invalid_category(client, token, bearer):
    r = _create(client, bearer(token), category="nope")
    assert r.status_code == 400


def test_feed_cursor_pagination(client, token, bearer):
    for i in range(3):
        _create(client, bearer(token), title=f"글{i}")
    r = client.get("/posts?limit=2", headers=bearer(token))
    d = r.get_json()
    assert len(d["items"]) == 2 and d["next_cursor"] is not None
    r2 = client.get(f"/posts?limit=2&cursor={d['next_cursor']}", headers=bearer(token))
    assert len(r2.get_json()["items"]) == 1


def test_detail_increments_view(client, token, bearer):
    pid = _create(client, bearer(token)).get_json()["id"]
    v1 = client.get(f"/posts/{pid}", headers=bearer(token)).get_json()["view_count"]
    v2 = client.get(f"/posts/{pid}", headers=bearer(token)).get_json()["view_count"]
    assert v2 == v1 + 1


def test_vote_and_duplicate_blocked(client, token, bearer):
    pid = _create(client, bearer(token), is_poll=True, poll={"a": "A", "b": "B"}).get_json()["id"]
    r = client.post(f"/posts/{pid}/vote", json={"side": "A"}, headers=bearer(token))
    assert r.status_code == 200 and r.get_json()["poll"]["my_vote"] == "A"
    r2 = client.post(f"/posts/{pid}/vote", json={"side": "B"}, headers=bearer(token))
    assert r2.status_code == 409


def test_like(client, token, bearer):
    pid = _create(client, bearer(token)).get_json()["id"]
    r = client.post(f"/posts/{pid}/like", headers=bearer(token))
    assert r.get_json()["like_count"] == 1


def test_delete_requires_owner(client, register, bearer):
    t1, _ = register("owner")
    t2, _ = register("other")
    pid = _create(client, bearer(t1)).get_json()["id"]
    assert client.delete(f"/posts/{pid}", headers=bearer(t2)).status_code == 403
    assert client.delete(f"/posts/{pid}", headers=bearer(t1)).status_code == 200
