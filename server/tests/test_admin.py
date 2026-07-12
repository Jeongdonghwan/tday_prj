"""Flask 웹 관리자 (admin) — TDD. DESIGN_UPDATE §5."""
from app.extensions import db
from app.models import Issue

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
