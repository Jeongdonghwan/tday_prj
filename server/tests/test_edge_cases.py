"""검증(400)·not_found(404)·conflict(409) 엣지케이스 — 기존 해피패스 스위트의 빈 곳."""
from app.extensions import db
from app.models import Post


def _post(client, headers, **kw):
    body = {"category": "free", "title": "t"}
    body.update(kw)
    return client.post("/posts", json=body, headers=headers)


def _poll(client, headers):
    return _post(client, headers, is_poll=True, poll={"a": "A", "b": "B"}).get_json()["id"]


# ---- posts ----
def test_post_title_required(client, token, bearer):
    assert _post(client, bearer(token), title="  ").status_code == 400


def test_post_get_missing_404(client, token, bearer):
    assert client.get("/posts/99999", headers=bearer(token)).status_code == 404


def test_post_delete_missing_404(client, token, bearer):
    assert client.delete("/posts/99999", headers=bearer(token)).status_code == 404


def test_vote_invalid_side_400(client, token, bearer):
    pid = _poll(client, bearer(token))
    assert client.post(f"/posts/{pid}/vote", json={"side": "Z"}, headers=bearer(token)).status_code == 400


def test_vote_not_a_poll_400(client, token, bearer):
    pid = _post(client, bearer(token)).get_json()["id"]
    assert client.post(f"/posts/{pid}/vote", json={"side": "A"}, headers=bearer(token)).status_code == 400


def test_vote_missing_post_404(client, token, bearer):
    assert client.post("/posts/99999/vote", json={"side": "A"}, headers=bearer(token)).status_code == 404


def test_like_missing_post_404(client, token, bearer):
    assert client.post("/posts/99999/like", headers=bearer(token)).status_code == 404


# ---- comments ----
def test_comment_on_missing_post_404(client, token, bearer):
    assert client.post("/posts/99999/comments", json={"body": "hi"}, headers=bearer(token)).status_code == 404


def test_comment_like_missing_404(client, token, bearer):
    assert client.post("/comments/99999/like", headers=bearer(token)).status_code == 404


# ---- issues ----
def test_issue_detail_missing_404(client, token, bearer):
    assert client.get("/issues/99999", headers=bearer(token)).status_code == 404


def test_issue_vote_missing_404(client, token, bearer):
    assert client.post("/issues/99999/vote", json={"side": "a"}, headers=bearer(token)).status_code == 404


def test_issue_comment_body_required(client, token, bearer, app):
    from app.services.issues import create_issue
    with app.app_context():
        create_issue(title="t", summary="s", source="x", url="u", poll_option_a="A", poll_option_b="B")
    iid = client.get("/issues/today", headers=bearer(token)).get_json()["issue"]["id"]
    assert client.post(f"/issues/{iid}/comments", json={"body": "  "}, headers=bearer(token)).status_code == 400


# ---- couple ----
def test_couple_join_code_required(client, token, bearer):
    assert client.post("/couple/join", json={}, headers=bearer(token)).status_code == 400


def test_start_date_no_couple_400(client, token, bearer):
    assert client.patch("/couple/start-date", json={"start_date": "2026-01-01"}, headers=bearer(token)).status_code == 400


def test_dday_not_connected(client, token, bearer):
    d = client.get("/couple/dday", headers=bearer(token)).get_json()
    assert d.get("connected") is False


# ---- schedules ----
def test_schedule_invalid_owner(client, token, bearer):
    r = client.post("/schedules", json={"owner": "z", "title": "t", "event_date": "2026-06-01"}, headers=bearer(token))
    assert r.status_code == 400


def test_schedule_title_required(client, token, bearer):
    r = client.post("/schedules", json={"owner": "a", "title": "", "event_date": "2026-06-01"}, headers=bearer(token))
    assert r.status_code == 400


def test_schedule_invalid_date(client, token, bearer):
    r = client.post("/schedules", json={"owner": "a", "title": "t", "event_date": "nope"}, headers=bearer(token))
    assert r.status_code == 400


def test_schedule_invalid_time(client, token, bearer):
    r = client.post("/schedules", json={"owner": "a", "title": "t", "event_date": "2026-06-01", "event_time": "99:99"}, headers=bearer(token))
    assert r.status_code == 400


# ---- auth ----
def test_social_provider_required(client):
    assert client.post("/auth/social", json={}).status_code == 400


def test_nickname_too_long_400(client, token, bearer):
    assert client.patch("/me", json={"nickname": "가" * 31}, headers=bearer(token)).status_code == 400


def test_avatar_out_of_range_ignored(client, token, bearer):
    before = client.get("/me", headers=bearer(token)).get_json()["avatar_no"]
    r = client.patch("/me", json={"avatar_no": 99}, headers=bearer(token))
    assert r.status_code == 200 and r.get_json()["avatar_no"] == before


# ---- uploads ----
def test_upload_no_extension_400(client, token, bearer, app, tmp_path):
    import io
    app.config["UPLOAD_DIR"] = str(tmp_path)
    data = {"file": (io.BytesIO(b"x"), "noext")}
    assert client.post("/uploads", data=data, headers=bearer(token), content_type="multipart/form-data").status_code == 400


def test_upload_too_large_400(client, token, bearer, app, tmp_path, monkeypatch):
    import io
    # monkeypatch → 세션 스코프 app.config 변경이 테스트 후 자동 복구(다른 업로드 테스트 오염 방지)
    monkeypatch.setitem(app.config, "UPLOAD_DIR", str(tmp_path))
    monkeypatch.setitem(app.config, "UPLOAD_MAX_BYTES", 10)
    data = {"file": (io.BytesIO(b"x" * 100), "big.png")}
    assert client.post("/uploads", data=data, headers=bearer(token), content_type="multipart/form-data").status_code == 400


# ---- ads ----
def test_ad_click_missing_404(client):
    assert client.post("/ads/99999/click").status_code == 404


# ---- daily_poll 3지선다 ----
def test_daily_poll_choice_c(client, token, bearer, app):
    from app.services.daily_poll import create_daily_poll
    with app.app_context():
        create_daily_poll("3지선다?", "A", "B", choice_c="C")
    r = client.post("/daily-poll/vote", json={"side": "c"}, headers=bearer(token))
    assert r.status_code == 200
    poll = r.get_json()["poll"]
    assert any(c["side"] == "c" for c in poll["choices"])


# ---- web/seo 404 ----
def test_testzone_slug_404(client):
    assert client.get("/t/nope-slug").status_code == 404


def test_seo_blinded_404(client, token, bearer, app):
    pid = _post(client, bearer(token)).get_json()["id"]
    with app.app_context():
        db.session.get(Post, pid).is_blinded = True
        db.session.commit()
    assert client.get(f"/p/{pid}").status_code == 404
