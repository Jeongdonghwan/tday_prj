"""내 활동 API (api/me.py) — 내 글 / 내 댓글."""


def _post(client, headers, title="글"):
    return client.post("/posts", json={"category": "free", "title": title}, headers=headers).get_json()["id"]


def test_my_posts_only_mine(client, token, bearer, register):
    _post(client, bearer(token), title="내 글1")
    other, _ = register("other")
    _post(client, bearer(other), title="남 글")
    items = client.get("/me/posts", headers=bearer(token)).get_json()["items"]
    assert [p["title"] for p in items] == ["내 글1"]


def test_my_comments_with_post_title(client, token, bearer, register):
    other, _ = register("author")
    pid = _post(client, bearer(other), title="원글 제목")
    client.post(f"/posts/{pid}/comments", json={"body": "내 댓글"}, headers=bearer(token))
    items = client.get("/me/comments", headers=bearer(token)).get_json()["items"]
    assert len(items) == 1
    assert items[0]["post_id"] == pid
    assert items[0]["post_title"] == "원글 제목"
    assert items[0]["body"] == "내 댓글"


def test_me_requires_auth(client):
    assert client.get("/me/posts").status_code == 401
    assert client.get("/me/comments").status_code == 401
