"""광고 슬롯 API — 활성 조회(노출) + 클릭."""
from datetime import datetime, timedelta

from app.extensions import db
from app.models import AdSlot


def _mk(app, position="feed_native", is_active=True, starts=None, ends=None):
    with app.app_context():
        ad = AdSlot(
            position=position, image="http://x/a.png", link_url="http://x",
            starts_at=starts or (datetime.utcnow() - timedelta(hours=1)),
            ends_at=ends, is_active=is_active, impressions=0, clicks=0,
        )
        db.session.add(ad)
        db.session.commit()
        return ad.id


def test_active_ad_and_impression(client, app):
    aid = _mk(app)
    r = client.get("/ads?position=feed_native").get_json()
    assert r["ad"]["id"] == aid and r["ad"]["link_url"] == "http://x"
    with app.app_context():
        assert db.session.get(AdSlot, aid).impressions == 1


def test_no_active_ad_returns_null(client):
    assert client.get("/ads?position=issue_bottom").get_json()["ad"] is None


def test_inactive_and_expired_excluded(client, app):
    _mk(app, position="web_rail", is_active=False)
    _mk(app, position="web_rail", ends=datetime.utcnow() - timedelta(hours=1))
    assert client.get("/ads?position=web_rail").get_json()["ad"] is None


def test_future_start_excluded(client, app):
    _mk(app, position="web_wing_l", starts=datetime.utcnow() + timedelta(hours=1))
    assert client.get("/ads?position=web_wing_l").get_json()["ad"] is None


def test_click_increments(client, app):
    aid = _mk(app)
    assert client.post(f"/ads/{aid}/click").status_code == 200
    with app.app_context():
        assert db.session.get(AdSlot, aid).clicks == 1


def test_invalid_position(client):
    assert client.get("/ads?position=nope").status_code == 400
