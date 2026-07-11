"""daily(오늘의 질문) API 회귀 테스트 (api/daily.py)."""
from datetime import date, timedelta

import pytest

from app.extensions import db
from app.models import DailyQuestion


@pytest.fixture
def seed_questions(app):
    with app.app_context():
        db.session.add_all([
            DailyQuestion(question="오늘 질문", scheduled_date=date.today()),
            DailyQuestion(question="어제 질문", scheduled_date=date.today() - timedelta(days=1)),
        ])
        db.session.commit()


def test_today_solo_mode(client, token, bearer, seed_questions):
    r = client.get("/daily/today", headers=bearer(token))
    d = r.get_json()
    assert d["question"]["text"] == "오늘 질문"
    assert d["my_answer"] is None
    assert d["connected"] is False
    assert d["streak"] == 0
    assert len(d["past"]) == 1


def test_answer_upsert_and_streak(client, token, bearer, seed_questions):
    r = client.post("/daily/answer", json={"answer": "내 답"}, headers=bearer(token))
    assert r.status_code == 200 and r.get_json()["streak"] == 1
    # 수정(upsert)
    client.post("/daily/answer", json={"answer": "수정한 답"}, headers=bearer(token))
    today = client.get("/daily/today", headers=bearer(token)).get_json()
    assert today["my_answer"] == "수정한 답"


def test_answer_requires_text(client, token, bearer, seed_questions):
    assert client.post("/daily/answer", json={"answer": " "}, headers=bearer(token)).status_code == 400


def test_question_to_post(client, token, bearer, seed_questions):
    qid = client.get("/daily/today", headers=bearer(token)).get_json()["question"]["id"]
    r = client.post(f"/daily/{qid}/to-post", headers=bearer(token))
    assert r.status_code == 201 and r.get_json()["post_id"]
