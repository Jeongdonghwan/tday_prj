"""홈 인기글 TOP5 (api/home.py) — TDD. HOME_UPDATE §2-3."""
from datetime import datetime, timedelta

from app.extensions import db
from app.models import Post


def _mk(uid, title, view=0, comment=0, like=0, hours=1):
    return Post(
        user_id=uid, category="free", title=title, is_poll=False, author_status="single",
        view_count=view, comment_count=comment, like_count=like,
        created_at=datetime.utcnow() - timedelta(hours=hours),
    )


def test_trending_weight_and_window(client, register, bearer, app):
    tok, uid = register("trend")
    with app.app_context():
        db.session.add_all([
            _mk(uid, "댓글왕", comment=10),   # weight 50
            _mk(uid, "조회왕", view=40),       # weight 40
            _mk(uid, "공감러", like=12),       # weight 36
            _mk(uid, "옛날글", comment=100, hours=30),  # 24h 초과 → 제외
        ])
        db.session.commit()
    items = client.get("/home/trending", headers=bearer(tok)).get_json()["items"]
    titles = [i["title"] for i in items]
    assert "옛날글" not in titles
    assert titles[:3] == ["댓글왕", "조회왕", "공감러"]
    assert "comment_count" in items[0]


def test_trending_top5_only(client, register, bearer, app):
    tok, uid = register("trend2")
    with app.app_context():
        db.session.add_all([_mk(uid, f"글{i}", view=i) for i in range(1, 9)])
        db.session.commit()
    items = client.get("/home/trending", headers=bearer(tok)).get_json()["items"]
    assert len(items) == 5


def test_trending_guest_readable(client):
    assert client.get("/home/trending").status_code == 200
