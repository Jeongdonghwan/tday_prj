"""신규 기능 갭 — 관리자 광고/테스트토글, 업로드 서빙, 구조화 시드, 커플 D-day, tests_api null."""
import io

from app.extensions import db
from app.models import Test


def _admin_token(app):
    return app.config["ADMIN_TOKEN"]


def _connect(client, register, bearer):
    a, _ = register("cpA")
    b, _ = register("cpB")
    code = client.post("/couple/invite", headers=bearer(a)).get_json()["invite_code"]
    client.post("/couple/join", json={"code": code}, headers=bearer(b))
    return a, b


# ---- 관리자 광고 ----
def test_admin_add_and_toggle_ad(client, app):
    tok = _admin_token(app)
    client.post("/admin/ads", data={"token": tok, "position": "feed_native", "image": "http://x/a.png", "link_url": "http://x", "is_active": "on"})
    got = client.get("/ads?position=feed_native").get_json()["ad"]
    assert got and got["link_url"] == "http://x"

    from app.models import AdSlot
    with app.app_context():
        aid = db.session.scalar(db.select(AdSlot.id))
    client.post(f"/admin/ads/{aid}/toggle", data={"token": tok})
    assert client.get("/ads?position=feed_native").get_json()["ad"] is None


def test_admin_toggle_test_activation(client, app):
    from app.services.psych import create_test_from_data
    with app.app_context():
        t = create_test_from_data(_mini_test_data())
        tid = t.id
    client.post(f"/admin/tests/{tid}/activate", data={"token": _admin_token(app)})
    with app.app_context():
        assert db.session.get(Test, tid).is_active is False


# ---- 업로드 서빙 ----
def test_upload_then_serve(client, token, bearer, app, tmp_path):
    app.config["UPLOAD_DIR"] = str(tmp_path)
    data = {"file": (io.BytesIO(b"\x89PNG\r\n img-bytes"), "x.png")}
    url = client.post("/uploads", data=data, headers=bearer(token), content_type="multipart/form-data").get_json()["url"]
    name = url.rsplit("/", 1)[1]
    served = client.get(f"/uploads/{name}")
    assert served.status_code == 200 and served.data == b"\x89PNG\r\n img-bytes"


# ---- 구조화 테스트 시드 (create_test_from_data) ----
def _mini_test_data():
    return {
        "slug": "mini-love", "title": "미니 테스트", "intro": "짧은 테스트",
        "tiebreak": ["AA", "BB"],
        "codes": {"AA": ("에이형", 1), "BB": ("비형", 2)},
        "questions": [("질문1?", [("선택 A", "AA"), ("선택 B", "BB")])],
        "results": {
            "AA": {"title": "에이형", "catch": "캐치A", "desc": "설명A", "match": "BB", "clash": "BB"},
            "BB": {"title": "비형", "catch": "캐치B", "desc": "설명B", "match": "AA", "clash": "AA"},
        },
    }


def test_create_test_from_data_and_idempotent(client, app):
    from app.services.psych import create_test_from_data
    from app.models import TestQuestion, TestResult
    with app.app_context():
        t = create_test_from_data(_mini_test_data())
        assert t and t.slug == "mini-love"
        assert db.session.scalar(db.select(db.func.count(TestQuestion.id)).where(TestQuestion.test_id == t.id)) == 1
        assert db.session.scalar(db.select(db.func.count(TestResult.id)).where(TestResult.test_id == t.id)) == 2
        # 중복 slug 재시드 → None
        assert create_test_from_data(_mini_test_data()) is None
    # 앱에 노출 (intro)
    assert client.get("/t/mini-love").status_code == 200


# ---- 커플 D-day + 마일스톤 ----
def test_dday_connected_with_milestone(client, register, bearer):
    a, b = _connect(client, register, bearer)
    from datetime import date, timedelta
    start = (date.today() - timedelta(days=50)).isoformat()
    r = client.patch("/couple/start-date", json={"date": start}, headers=bearer(a))
    assert r.status_code == 200
    d = client.get("/couple/dday", headers=bearer(b)).get_json()
    assert d["connected"] is True
    assert d["days"] == 51
    assert d["next"]["label"] and d["next"]["d_day"] >= 0


# ---- tests_api null 분기 ----
def test_promo_null_when_no_recent_test(client, token, bearer):
    assert client.get("/tests/promo", headers=bearer(token)).get_json()["test"] is None


def test_badge_null_when_no_attempt(client, token, bearer):
    assert client.get("/me/test-badge", headers=bearer(token)).get_json()["badge"] is None
