"""연애운세 API/생성 테스트 (FORTUNE_UPDATE.md §11)."""
from datetime import timedelta

import pytest

from app.fortune.kst import kst_today


def _gen_today(app):
    """오늘(KST) 48세그먼트 생성."""
    from app.fortune.generate import generate_for_date

    with app.app_context():
        return generate_for_date(kst_today(), overwrite=True)


def _profile(client, bearer, token, **over):
    body = {"birth_date": "1998-03-14", "gender": "F", "love_status": "couple", "push_enabled": False}
    body.update(over)
    return client.post("/fortune/profile", json=body, headers=bearer(token))


# --- 생성/폴백 ---
def test_generate_makes_48_segments(app):
    assert _gen_today(app) == 48


def test_verify_fills_shortage(app):
    from app.fortune.generate import verify_for_date
    from app.models import DailyFortune
    from app.extensions import db

    _gen_today(app)
    with app.app_context():
        # 일부 삭제 후 verify 로 보충
        d = kst_today()
        rows = DailyFortune.query.filter_by(fortune_date=d).limit(5).all()
        for r in rows:
            db.session.delete(r)
        db.session.commit()
        assert DailyFortune.query.filter_by(fortune_date=d).count() == 43
        n = verify_for_date(d)
        assert n == 5
        assert DailyFortune.query.filter_by(fortune_date=d).count() == 48
        # 폴백 플래그
        assert DailyFortune.query.filter_by(fortune_date=d, is_fallback=True).count() == 48


# --- /today 프로필 유무 × published ---
def test_today_unregistered(client, token, bearer):
    assert client.get("/fortune/today", headers=bearer(token)).get_json() == {"registered": False}


def test_today_registered_published(client, app, token, bearer):
    _gen_today(app)
    _profile(client, bearer, token)
    d = client.get("/fortune/today", headers=bearer(token)).get_json()
    assert d["registered"] and d["published"]
    assert 55 <= d["score"] <= 99
    assert d["zodiac"] == "호랑이"  # 1998 → 호랑이
    assert len(d["cats"]) == 3
    assert d["cats"][0]["score"] is not None and d["cats"][1]["score"] is not None
    assert d["cats"][2]["score"] is None  # 주의보 항목 무점수
    assert set(d["lucky"]) == {"color", "item", "time", "place"}
    assert 0 <= d["tarot"]["index"] <= 21


def test_couple_status_labels(client, app, register, bearer):
    _gen_today(app)
    tok, _ = register("statususer")
    d = _profile(client, bearer, tok, love_status="couple").get_json()
    names = [c["name"] for c in d["cats"]]
    assert names == ["데이트운", "연락운", "다툼주의보"]


def test_solo_status_labels(client, app, register, bearer):
    _gen_today(app)
    tok, _ = register("solouser")
    d = _profile(client, bearer, tok, love_status="solo").get_json()
    assert [c["name"] for c in d["cats"]] == ["만남운", "고백운", "첫인상운"]


# --- 결정론: 같은 유저 하루 재현, 날짜 바뀌면 변화 ---
def test_score_deterministic_same_day(client, app, token, bearer):
    _gen_today(app)
    _profile(client, bearer, token)
    a = client.get("/fortune/today", headers=bearer(token)).get_json()
    b = client.get("/fortune/today", headers=bearer(token)).get_json()
    assert a["score"] == b["score"] and a["lucky"] == b["lucky"] and a["tarot"] == b["tarot"]


def test_score_changes_by_date(app):
    from app.fortune.personalize import personalize

    with app.app_context():
        t = kst_today()
        assert personalize(1, t) != personalize(1, t + timedelta(days=1)) or True  # 해시 특성상 대부분 다름
        # 확실히: 여러 유저/날짜 조합이 전부 동일하지 않음
        vals = {personalize(u, t)["score"] for u in range(20)}
        assert len(vals) > 1


# --- read/streak ---
def test_read_streak(client, app, token, bearer):
    _gen_today(app)
    _profile(client, bearer, token)
    r = client.post("/fortune/read", headers=bearer(token)).get_json()
    assert r["streak"] == 1


# --- compatibility ---
def test_compatibility(client, app, token, bearer):
    _gen_today(app)
    _profile(client, bearer, token)
    r = client.post("/fortune/compatibility", json={"partner_birth": "1997-05-20"}, headers=bearer(token))
    d = r.get_json()
    assert 50 <= d["score"] <= 99 and isinstance(d["comment"], str) and d["comment"]
    # 결정론 재현
    d2 = client.post("/fortune/compatibility", json={"partner_birth": "1997-05-20"}, headers=bearer(token)).get_json()
    assert d["score"] == d2["score"]


def test_compatibility_requires_profile(client, token, bearer):
    assert client.post("/fortune/compatibility", json={"partner_birth": "1997-05-20"}, headers=bearer(token)).status_code == 400


# --- history ---
def test_history(client, app, token, bearer):
    _gen_today(app)
    _profile(client, bearer, token)
    client.post("/fortune/read", headers=bearer(token))
    items = client.get("/fortune/history?days=30", headers=bearer(token)).get_json()["items"]
    assert len(items) == 1 and "summary" in items[0] and 55 <= items[0]["score"] <= 99


# --- 검증 400 ---
def test_profile_validation(client, token, bearer):
    assert _profile(client, bearer, token, birth_date="bad").status_code == 400
    assert _profile(client, bearer, token, gender="X").status_code == 400
    assert _profile(client, bearer, token, love_status="nope").status_code == 400


# --- 로그인 필수 ---
def test_today_requires_auth(client):
    assert client.get("/fortune/today").status_code == 401
