"""커뮤니티 A/B 데일리 폴 (api/daily_poll.py) — TDD. DESIGN_UPDATE §3."""
from datetime import date

import pytest

from app.extensions import db
from app.models import DailyPoll


@pytest.fixture
def poll(app):
    with app.app_context():
        db.session.add(
            DailyPoll(
                question="축의금 10만원, 적당한가?",
                choice_a="적당하다",
                choice_b="짜다",
                scheduled_date=date.today(),
                is_active=True,
            )
        )
        db.session.commit()


def test_today_no_active_poll(client, token, bearer):
    r = client.get("/daily-poll/today", headers=bearer(token))
    assert r.status_code == 200
    assert r.get_json()["poll"] is None


def test_today_shows_poll_before_vote(client, token, bearer, poll):
    d = client.get("/daily-poll/today", headers=bearer(token)).get_json()["poll"]
    assert d["question"].startswith("축의금")
    assert d["my_vote"] is None
    assert d["total"] == 0
    assert {c["side"] for c in d["choices"]} == {"a", "b"}


def test_vote_returns_result(client, token, bearer, poll):
    r = client.post("/daily-poll/vote", json={"side": "a"}, headers=bearer(token))
    assert r.status_code == 200
    d = r.get_json()["poll"]
    assert d["my_vote"] == "a" and d["total"] == 1
    a = next(c for c in d["choices"] if c["side"] == "a")
    assert a["count"] == 1 and a["pct"] == 100


def test_duplicate_vote_blocked(client, token, bearer, poll):
    assert client.post("/daily-poll/vote", json={"side": "a"}, headers=bearer(token)).status_code == 200
    assert client.post("/daily-poll/vote", json={"side": "b"}, headers=bearer(token)).status_code == 409


def test_invalid_side(client, token, bearer, poll):
    assert client.post("/daily-poll/vote", json={"side": "z"}, headers=bearer(token)).status_code == 400


def test_couple_partner_vote_revealed_when_both_voted(client, register, bearer, poll):
    a, _ = register("pollA")
    b, _ = register("pollB")
    code = client.post("/couple/invite", headers=bearer(a)).get_json()["invite_code"]
    client.post("/couple/join", json={"code": code}, headers=bearer(b))

    client.post("/daily-poll/vote", json={"side": "a"}, headers=bearer(a))
    # 상대 미투표 → 공개 안 됨
    assert client.get("/daily-poll/today", headers=bearer(a)).get_json()["poll"]["partner_vote"] is None

    client.post("/daily-poll/vote", json={"side": "b"}, headers=bearer(b))
    # 둘 다 투표 → 상대 선택 공개
    assert client.get("/daily-poll/today", headers=bearer(a)).get_json()["poll"]["partner_vote"] == "b"


def test_past_polls_listed(client, token, bearer, app):
    from datetime import timedelta

    with app.app_context():
        db.session.add_all([
            DailyPoll(question="오늘 폴", choice_a="A", choice_b="B", scheduled_date=date.today(), is_active=True),
            DailyPoll(question="어제 폴", choice_a="A", choice_b="B", scheduled_date=date.today() - timedelta(days=1), is_active=False),
        ])
        db.session.commit()
    past = client.get("/daily-poll/today", headers=bearer(token)).get_json()["past"]
    assert any(p["question"] == "어제 폴" for p in past)
