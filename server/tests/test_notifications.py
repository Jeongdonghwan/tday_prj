"""알림 API (api/notifications.py) — 내 글에 달린 댓글 파생 조회."""


def _post(client, headers, title="내 글"):
    return client.post("/posts", json={"category": "free", "title": title}, headers=headers).get_json()["id"]


def test_notifies_comment_on_my_post(client, token, bearer, register):
    pid = _post(client, bearer(token))
    other, _ = register("commenter")
    client.post(f"/posts/{pid}/comments", json={"body": "댓글 달았어요"}, headers=bearer(other))

    items = client.get("/notifications", headers=bearer(token)).get_json()["items"]
    assert len(items) == 1
    assert items[0]["type"] == "comment"
    assert items[0]["post_id"] == pid
    assert items[0]["post_title"] == "내 글"
    assert items[0]["snippet"] == "댓글 달았어요"
    assert items[0]["created_at"]


def test_own_comment_not_notified(client, token, bearer):
    pid = _post(client, bearer(token))
    client.post(f"/posts/{pid}/comments", json={"body": "내가 단 댓글"}, headers=bearer(token))
    assert client.get("/notifications", headers=bearer(token)).get_json()["items"] == []


def test_only_my_posts_notify(client, token, bearer, register):
    other, _ = register("author2")
    pid = _post(client, bearer(other), title="남의 글")
    client.post(f"/posts/{pid}/comments", json={"body": "내 댓글"}, headers=bearer(token))
    # 글 주인에게만 알림, 댓글 단 나에겐 없음
    assert client.get("/notifications", headers=bearer(token)).get_json()["items"] == []
    assert len(client.get("/notifications", headers=bearer(other)).get_json()["items"]) == 1


def test_requires_auth(client):
    assert client.get("/notifications").status_code == 401
