"""best API + ranking 회귀 테스트 (api/best.py, ranking.py)."""
from app.ranking import recompute_hot_scores


def _poll(client, headers, title):
    return client.post(
        "/posts",
        json={"category": "love", "title": title, "is_poll": True, "poll": {"a": "A", "b": "B"}},
        headers=headers,
    ).get_json()["id"]


def test_best_periods_return_items(client, app, token, bearer):
    for i in range(3):
        _poll(client, bearer(token), f"인기{i}")
    with app.app_context():
        recompute_hot_scores()
    for period in ("realtime", "today", "weekly"):
        r = client.get(f"/best?period={period}")
        assert r.status_code == 200
        assert len(r.get_json()["items"]) == 3


def test_best_comments(client, token, bearer):
    pid = client.post("/posts", json={"category": "free", "title": "t"}, headers=bearer(token)).get_json()["id"]
    cid = client.post(f"/posts/{pid}/comments", json={"body": "명댓글"}, headers=bearer(token)).get_json()["id"]
    client.post(f"/comments/{cid}/like", headers=bearer(token))
    r = client.get("/best/comments")
    items = r.get_json()["items"]
    assert items and items[0]["post_title"] == "t"


def test_category_filter(client, token, bearer):
    _poll(client, bearer(token), "연애글")
    client.post("/posts", json={"category": "free", "title": "자유글"}, headers=bearer(token))
    r = client.get("/best?period=weekly&category=love")
    titles = [p["title"] for p in r.get_json()["items"]]
    assert "연애글" in titles and "자유글" not in titles


def test_hot_score_recompute(client, app, token, bearer):
    pid = _poll(client, bearer(token), "핫")
    client.post(f"/posts/{pid}/like", headers=bearer(token))
    with app.app_context():
        n = recompute_hot_scores()
    assert n >= 1
