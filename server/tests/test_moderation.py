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


def test_block_excludes_comments(client, register, bearer):
    """차단 시 상대의 댓글도 목록에서 제외 (UGC enforcement 확장, 글로벌 Phase 3)."""
    me, _ = register("me")
    other, other_id = register("other")
    pid = _post(client, bearer(me), title="글")
    client.post(f"/posts/{pid}/comments", json={"body": "차단대상 댓글"}, headers=bearer(other))

    # 차단 전엔 보임
    before = client.get(f"/posts/{pid}/comments", headers=bearer(me)).get_json()["items"]
    assert len(before) == 1

    client.post("/blocks", json={"blocked_user_id": other_id}, headers=bearer(me))
    after = client.get(f"/posts/{pid}/comments", headers=bearer(me)).get_json()["items"]
    assert after == []
    # 게스트(비로그인)에겐 그대로 보임(차단은 개인 설정)
    guest = client.get(f"/posts/{pid}/comments").get_json()["items"]
    assert len(guest) == 1


def test_report_threshold_blinds_issue_comment(client, token, bearer, app):
    """이슈 댓글 신고 누적 → 자동 블라인드 (UGC 개별 신고 요건)."""
    from app.services.issues import create_issue

    with app.app_context():
        issue = create_issue(title="이슈", summary="요약", source=None, url=None,
                             poll_option_a="A", poll_option_b="B")
        iid = issue.id

    cid = client.post(f"/issues/{iid}/comments", json={"body": "신고대상"}, headers=bearer(token)).get_json()["id"]

    blinded = False
    for _ in range(5):
        r = client.post("/reports", json={"target_type": "issue_comment", "target_id": cid, "reason": "spam"}, headers=bearer(token))
        assert r.status_code == 201
        blinded = r.get_json()["blinded"] or blinded
    assert blinded
    # 블라인드된 이슈 댓글은 목록에서 제외
    items = client.get(f"/issues/{iid}/comments").get_json()["items"]
    assert cid not in [c["id"] for c in items]
