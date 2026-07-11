"""Expo 푸시 발송 (app/push.py) + 커플 답변 트리거 — TDD."""
from datetime import date

import pytest

from app.extensions import db
from app.models import DailyQuestion
from app.push import send_push


def test_send_push_posts_expo_payload(app, monkeypatch):
    calls = []

    class _R:
        status_code = 200

    def fake_post(url, json=None, **kw):
        calls.append((url, json))
        return _R()

    monkeypatch.setattr("app.push.requests.post", fake_post)
    with app.app_context():
        n = send_push(["tok1", "tok2"], "제목", "내용", {"k": "v"})

    assert n == 2
    assert calls[0][0].endswith("/push/send")
    msgs = calls[0][1]
    assert msgs[0]["to"] == "tok1" and msgs[0]["title"] == "제목" and msgs[0]["data"] == {"k": "v"}


def test_send_push_chunks_over_100(app, monkeypatch):
    chunks = []
    monkeypatch.setattr("app.push.requests.post", lambda url, json=None, **kw: chunks.append(len(json)) or type("R", (), {"status_code": 200})())
    with app.app_context():
        send_push([f"t{i}" for i in range(250)], "t", "b")
    assert chunks == [100, 100, 50]


def test_send_push_skips_empty(app, monkeypatch):
    called = []
    monkeypatch.setattr("app.push.requests.post", lambda *a, **k: called.append(1))
    with app.app_context():
        assert send_push([], "t", "b") == 0
    assert not called


@pytest.fixture
def question(app):
    with app.app_context():
        db.session.add(DailyQuestion(question="오늘 질문", scheduled_date=date.today()))
        db.session.commit()


def test_couple_both_answered_triggers_push(client, register, bearer, monkeypatch, question):
    sent = []
    monkeypatch.setattr("app.api.daily.send_push", lambda tokens, title, body, data=None: sent.append((tokens, title)))

    a, _ = register("pushA")
    b, _ = register("pushB")
    code = client.post("/couple/invite", headers=bearer(a)).get_json()["invite_code"]
    client.post("/couple/join", json={"code": code}, headers=bearer(b))
    client.patch("/me", json={"push_token": "tokA"}, headers=bearer(a))
    client.patch("/me", json={"push_token": "tokB"}, headers=bearer(b))

    client.post("/daily/answer", json={"answer": "A답"}, headers=bearer(a))
    assert sent == []  # 아직 한 명만 답함
    client.post("/daily/answer", json={"answer": "B답"}, headers=bearer(b))
    assert len(sent) == 1
    assert set(sent[0][0]) == {"tokA", "tokB"}
