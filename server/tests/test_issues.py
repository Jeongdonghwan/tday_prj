"""오늘의 연애 이슈 (api/issues.py) — TDD. DESIGN_UPDATE §5."""
import pytest

from app.services.issues import create_issue


@pytest.fixture
def issue(app):
    with app.app_context():
        create_issue(
            title="축의금 논쟁",
            summary="결혼식 축의금 적정선 논쟁",
            source="한겨레",
            url="https://example.com/a",
            poll_option_a="10만원",
            poll_option_b="5만원",
        )


def test_today_none(client, token, bearer):
    assert client.get("/issues/today", headers=bearer(token)).get_json()["issue"] is None


def test_today_and_vote(client, token, bearer, issue):
    d = client.get("/issues/today", headers=bearer(token)).get_json()["issue"]
    assert d["title"] == "축의금 논쟁"
    assert d["my_vote"] is None
    iid = d["id"]
    r = client.post(f"/issues/{iid}/vote", json={"side": "a"}, headers=bearer(token))
    assert r.status_code == 200
    res = r.get_json()["issue"]
    assert res["my_vote"] == "a" and res["poll"]["total"] == 1


def test_duplicate_vote(client, token, bearer, issue):
    iid = client.get("/issues/today", headers=bearer(token)).get_json()["issue"]["id"]
    client.post(f"/issues/{iid}/vote", json={"side": "a"}, headers=bearer(token))
    assert client.post(f"/issues/{iid}/vote", json={"side": "b"}, headers=bearer(token)).status_code == 409


def test_new_issue_deactivates_previous(client, token, bearer, app):
    with app.app_context():
        create_issue(title="이슈1", summary="s", source="src", url="u", poll_option_a="A", poll_option_b="B")
        create_issue(title="이슈2", summary="s", source="src", url="u", poll_option_a="A", poll_option_b="B")
    assert client.get("/issues/today", headers=bearer(token)).get_json()["issue"]["title"] == "이슈2"


def test_detail_fields(client, token, bearer, issue):
    iid = client.get("/issues/today", headers=bearer(token)).get_json()["issue"]["id"]
    d = client.get(f"/issues/{iid}", headers=bearer(token)).get_json()["issue"]
    assert d["summary"].startswith("결혼식") and d["source"] == "한겨레" and d["url"].startswith("https")
    assert "poll" in d


def test_issue_comments(client, token, bearer, issue):
    iid = client.get("/issues/today", headers=bearer(token)).get_json()["issue"]["id"]
    c = client.post(f"/issues/{iid}/comments", json={"body": "내 생각은"}, headers=bearer(token))
    assert c.status_code == 201 and c.get_json()["author"]["avatar_no"]
    assert client.get(f"/issues/{iid}/comments").get_json()["count"] == 1
    assert client.get(f"/issues/{iid}", headers=bearer(token)).get_json()["issue"]["comment_count"] == 1


def test_archive_lists_past_inactive(client, token, bearer, app):
    with app.app_context():
        create_issue(title="지난이슈1", summary="s", source="src", url="u", poll_option_a="A", poll_option_b="B")
        create_issue(title="오늘이슈", summary="s", source="src", url="u", poll_option_a="A", poll_option_b="B")
    # 오늘이슈가 활성 → 아카이브엔 지난이슈1만
    arc = client.get("/issues/archive", headers=bearer(token)).get_json()["items"]
    titles = [i["title"] for i in arc]
    assert "지난이슈1" in titles and "오늘이슈" not in titles
    row = next(i for i in arc if i["title"] == "지난이슈1")
    assert "a_pct" in row and "comment_count" in row and "date" in row
