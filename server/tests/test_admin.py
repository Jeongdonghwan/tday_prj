"""Flask 웹 관리자 (admin) — TDD. DESIGN_UPDATE §5 + 확장(오늘의질문·통계·회원관리)."""
from app.extensions import db
from app.models import DailyPoll, Issue, Post
from app.services.daily_poll import create_daily_poll

TOKEN = "test-secret"  # TestConfig 에는 ADMIN_TOKEN 미설정 → 기본값 사용


def _token(app):
    return app.config["ADMIN_TOKEN"]


def test_dashboard_requires_token(client):
    assert client.get("/admin").status_code == 401
    assert client.get("/admin?token=wrong").status_code == 401


def test_dashboard_with_token(client, app):
    r = client.get(f"/admin?token={_token(app)}")
    assert r.status_code == 200
    assert "관리자" in r.get_data(as_text=True)


def test_add_issue_deactivates_previous(client, app):
    tok = _token(app)
    client.post("/admin/issues", data={
        "token": tok, "title": "이슈1", "summary": "요약1",
        "poll_option_a": "A", "poll_option_b": "B",
    })
    client.post("/admin/issues", data={
        "token": tok, "title": "이슈2", "summary": "요약2",
        "poll_option_a": "A", "poll_option_b": "B",
    })
    with app.app_context():
        active = Issue.query.filter_by(is_active=True).all()
        assert len(active) == 1 and active[0].title == "이슈2"


def test_add_issue_rejects_no_token(client):
    r = client.post("/admin/issues", data={"title": "x"})
    assert r.status_code == 401


def test_dashboard_has_new_sections(client, app):
    body = client.get(f"/admin?token={_token(app)}").get_data(as_text=True)
    assert "통계" in body and "오늘의 질문 등록" in body and "회원관리" in body


def test_create_daily_poll_deactivates_previous(app):
    with app.app_context():
        create_daily_poll("q1", "a", "b")
        create_daily_poll("q2", "a", "b")
        active = DailyPoll.query.filter_by(is_active=True).all()
        assert len(active) == 1 and active[0].question == "q2"


def test_add_daily_poll_route(client, app):
    tok = _token(app)
    client.post("/admin/daily-poll", data={"token": tok, "question": "오늘 질문?", "choice_a": "A", "choice_b": "B"})
    with app.app_context():
        active = DailyPoll.query.filter_by(is_active=True).all()
        assert len(active) == 1 and active[0].question == "오늘 질문?"


def test_moderate_user_blinds_and_restores(client, app, register, bearer):
    tok = _token(app)
    utok, uid = register("victim")
    pid = client.post("/posts", json={"category": "free", "title": "t"}, headers=bearer(utok)).get_json()["id"]

    client.post(f"/admin/users/{uid}/moderate", data={"token": tok, "op": "blind"})
    with app.app_context():
        assert db.session.get(Post, pid).is_blinded is True

    client.post(f"/admin/users/{uid}/moderate", data={"token": tok, "op": "unblind"})
    with app.app_context():
        assert db.session.get(Post, pid).is_blinded is False


def test_add_daily_question_and_replace(client, app):
    """커플 오늘의 질문 등록 + 같은 날짜 재등록 시 교체."""
    from app.extensions import db
    from app.models import DailyQuestion

    tok = _token(app)
    r = client.post("/admin/daily-question", data={"token": tok, "question": "첫 설렘 순간은?", "scheduled_date": "2026-08-01"})
    assert r.status_code == 302

    r = client.post("/admin/daily-question", data={"token": tok, "question": "교체된 질문", "scheduled_date": "2026-08-01"})
    assert r.status_code == 302

    with app.app_context():
        rows = db.session.query(DailyQuestion).filter_by(scheduled_date=__import__("datetime").date(2026, 8, 1)).all()
        assert len(rows) == 1 and rows[0].question == "교체된 질문"


def test_add_daily_question_requires_fields(client, app):
    tok = _token(app)
    r = client.post("/admin/daily-question", data={"token": tok, "question": "", "scheduled_date": ""}, follow_redirects=True)
    assert "질문과 날짜" in r.get_data(as_text=True)
