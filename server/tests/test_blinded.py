"""is_blinded 행이 각 목록/피드에서 제외되는지 — 신고 누적 가림의 실효성 회귀."""
from app.extensions import db
from app.models import Comment, Post


def _post(client, headers, title="글"):
    return client.post("/posts", json={"category": "free", "title": title}, headers=headers).get_json()["id"]


def _blind_post(app, pid):
    with app.app_context():
        db.session.get(Post, pid).is_blinded = True
        db.session.commit()


def _blind_comment(app, cid):
    with app.app_context():
        db.session.get(Comment, cid).is_blinded = True
        db.session.commit()


def test_blinded_post_excluded_from_feed(client, token, bearer, app):
    keep = _post(client, bearer(token), "보이는글")
    hide = _post(client, bearer(token), "가려진글")
    _blind_post(app, hide)
    ids = [p["id"] for p in client.get("/posts", headers=bearer(token)).get_json()["items"]]
    assert keep in ids and hide not in ids


def test_blinded_post_excluded_from_me_posts(client, token, bearer, app):
    keep = _post(client, bearer(token), "내보이는글")
    hide = _post(client, bearer(token), "내가려진글")
    _blind_post(app, hide)
    ids = [p["id"] for p in client.get("/me/posts", headers=bearer(token)).get_json()["items"]]
    assert keep in ids and hide not in ids


def test_blinded_post_excluded_from_best(client, token, bearer, app):
    hide = _post(client, bearer(token), "베스트가려짐")
    _blind_post(app, hide)
    ids = [p["id"] for p in client.get("/best?period=realtime", headers=bearer(token)).get_json()["items"]]
    assert hide not in ids


def test_blinded_comment_excluded_from_list(client, token, bearer, app):
    pid = _post(client, bearer(token))
    keep = client.post(f"/posts/{pid}/comments", json={"body": "보임"}, headers=bearer(token)).get_json()["id"]
    hide = client.post(f"/posts/{pid}/comments", json={"body": "가림"}, headers=bearer(token)).get_json()["id"]
    _blind_comment(app, hide)
    listed = client.get(f"/posts/{pid}/comments").get_json()
    ids = [c["id"] for c in listed["items"]]
    assert keep in ids and hide not in ids


def test_blinded_comment_excluded_from_notifications(client, token, bearer, register, app):
    pid = _post(client, bearer(token))
    other, _ = register("commenter")
    cid = client.post(f"/posts/{pid}/comments", json={"body": "댓글"}, headers=bearer(other)).get_json()["id"]
    assert len(client.get("/notifications", headers=bearer(token)).get_json()["items"]) == 1
    _blind_comment(app, cid)
    assert client.get("/notifications", headers=bearer(token)).get_json()["items"] == []


def test_blinded_post_excluded_from_sitemap(client, token, bearer, app):
    hide = _post(client, bearer(token))
    _blind_post(app, hide)
    assert f"/p/{hide}" not in client.get("/sitemap.xml").get_data(as_text=True)
