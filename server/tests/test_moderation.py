"""moderation API 회귀 테스트 (api/moderation.py). 스펙 §10 필수."""


def _post(client, headers, title="t"):
    return client.post("/posts", json={"category": "free", "title": title}, headers=headers).get_json()["id"]


def test_report_threshold_blinds_post(client, token, bearer):
    pid = _post(client, bearer(token))
    blinded = False
    for _ in range(5):
        r = client.post("/reports", json={"target_type": "post", "target_id": pid, "reason": "spam"}, headers=bearer(token))
        assert r.status_code == 201
        blinded = r.get_json()["blinded"] or blinded
    assert blinded
    assert client.get(f"/posts/{pid}", headers=bearer(token)).status_code == 404


def test_report_invalid_target(client, token, bearer):
    assert client.post("/reports", json={"target_type": "nope", "target_id": 1}, headers=bearer(token)).status_code == 400


def test_block_excludes_from_feed_and_can_unblock(client, register, bearer):
    me, _ = register("me")
    other, other_id = register("other")
    other_post = _post(client, bearer(other), title="차단대상")

    client.post("/blocks", json={"blocked_user_id": other_id}, headers=bearer(me))
    feed = client.get("/posts?limit=50", headers=bearer(me)).get_json()["items"]
    assert other_post not in [p["id"] for p in feed]

    blocks = client.get("/blocks", headers=bearer(me)).get_json()["items"]
    assert any(b["user_id"] == other_id for b in blocks)
    bid = blocks[0]["block_id"]
    assert client.delete(f"/blocks/{bid}", headers=bearer(me)).status_code == 200


def test_cannot_block_self(client, register, bearer):
    me, me_id = register("me")
    assert client.post("/blocks", json={"blocked_user_id": me_id}, headers=bearer(me)).status_code == 400
