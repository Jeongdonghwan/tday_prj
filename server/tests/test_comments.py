"""comments API 회귀 테스트 (api/comments.py)."""


def _post(client, headers):
    return client.post("/posts", json={"category": "free", "title": "t"}, headers=headers).get_json()["id"]


def test_create_and_list_with_nested_reply(client, token, bearer):
    pid = _post(client, bearer(token))
    c = client.post(f"/posts/{pid}/comments", json={"body": "최상위"}, headers=bearer(token))
    assert c.status_code == 201
    cid = c.get_json()["id"]
    assert c.get_json()["author"]["status_label"] == "돌싱"

    client.post(f"/posts/{pid}/comments", json={"body": "대댓글", "parent_id": cid}, headers=bearer(token))
    listed = client.get(f"/posts/{pid}/comments").get_json()
    assert len(listed["items"]) == 1
    assert listed["count"] == 2
    assert listed["items"][0]["reply_count"] == 1
    assert listed["items"][0]["replies"][0]["body"] == "대댓글"


def test_comment_count_increments_post(client, token, bearer):
    pid = _post(client, bearer(token))
    client.post(f"/posts/{pid}/comments", json={"body": "1"}, headers=bearer(token))
    detail = client.get(f"/posts/{pid}", headers=bearer(token)).get_json()
    assert detail["comment_count"] == 1


def test_empty_body_rejected(client, token, bearer):
    pid = _post(client, bearer(token))
    assert client.post(f"/posts/{pid}/comments", json={"body": "  "}, headers=bearer(token)).status_code == 400


def test_invalid_parent_rejected(client, token, bearer):
    pid = _post(client, bearer(token))
    r = client.post(f"/posts/{pid}/comments", json={"body": "x", "parent_id": 99999}, headers=bearer(token))
    assert r.status_code == 400


def test_comment_like_toggle(client, token, bearer):
    """댓글 좋아요 — 토글(다시 누르면 취소), 유저당 1회."""
    pid = _post(client, bearer(token))
    cid = client.post(f"/posts/{pid}/comments", json={"body": "x"}, headers=bearer(token)).get_json()["id"]

    r = client.post(f"/comments/{cid}/like", headers=bearer(token))
    assert r.get_json() == {"like_count": 1, "liked": True}
    # 같은 유저 재시도 → 취소 (무한 좋아요 방지)
    r = client.post(f"/comments/{cid}/like", headers=bearer(token))
    assert r.get_json() == {"like_count": 0, "liked": False}


def test_comment_list_includes_liked_flag(client, register, bearer):
    t1, _ = register("liker1")
    t2, _ = register("liker2")
    pid = _post(client, bearer(t1))
    cid = client.post(f"/posts/{pid}/comments", json={"body": "x"}, headers=bearer(t1)).get_json()["id"]
    client.post(f"/comments/{cid}/like", headers=bearer(t1))

    mine = client.get(f"/posts/{pid}/comments", headers=bearer(t1)).get_json()["items"][0]
    other = client.get(f"/posts/{pid}/comments", headers=bearer(t2)).get_json()["items"][0]
    guest = client.get(f"/posts/{pid}/comments").get_json()["items"][0]
    assert mine["liked"] is True and other["liked"] is False and guest["liked"] is False
    assert mine["id"] == cid
