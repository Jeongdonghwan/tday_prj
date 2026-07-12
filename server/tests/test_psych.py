"""심리테스트존 (services/psych, web) — TDD. DESIGN_UPDATE §6."""
from pathlib import Path

import pytest

from app.extensions import db
from app.models import Test, TestAttempt, TestResult
from app.services.psych import parse_test_md, score, seed_test

MD_PATH = Path(__file__).resolve().parents[2] / "sulzun_design_update" / "tests" / "test01_love_type.md"
MD = MD_PATH.read_text(encoding="utf-8")


@pytest.fixture
def seeded(app):
    with app.app_context():
        seed_test(MD)


def test_parse_md():
    d = parse_test_md(MD)
    assert d["slug"] == "love-type"
    assert len(d["questions"]) == 12
    assert len(d["results"]) == 6
    assert d["tiebreak"][:2] == ["RB", "DG"]
    rb = next(r for r in d["results"] if r["code"] == "RB")
    assert rb["avatar_no"] == 1
    assert rb["match_code"] == "CT"  # 새침냥이형
    assert rb["clash_code"] == "FX"  # 밀당 여우형
    assert rb["catchphrase"]


def test_scoring_tally_and_tiebreak():
    assert score(["RB", "RB", "FX"], {"RB", "FX"}, ["RB"]) == "RB"
    assert score(["RB", "FX"], {"RB", "FX"}, ["FX", "RB"]) == "FX"  # 동점 → tiebreak


def test_seed_idempotent(app, seeded):
    with app.app_context():
        assert Test.query.filter_by(slug="love-type").count() == 1
        seed_test(MD)
        assert Test.query.filter_by(slug="love-type").count() == 1
        assert TestResult.query.count() == 6


def test_intro_page(client, seeded):
    r = client.get("/t/love-type")
    assert r.status_code == 200
    assert "연애 스타일" in r.get_data(as_text=True)


def test_quiz_page_has_questions(client, seeded):
    r = client.get("/t/love-type/quiz")
    assert r.status_code == 200
    assert "QUESTIONS" in r.get_data(as_text=True)


def test_submit_creates_attempt_with_ref(client, seeded, app):
    r = client.post("/t/love-type/submit", json={"answers": ["RB"] * 12, "ref": "kakao"})
    assert r.status_code == 200
    assert r.get_json()["result_code"] == "RB"
    with app.app_context():
        att = TestAttempt.query.first()
        assert att is not None and att.ref == "kakao" and att.anon_uuid


def test_result_page(client, seeded):
    r = client.get("/t/love-type/result/RB")
    assert r.status_code == 200
    body = r.get_data(as_text=True)
    assert "하트토끼" in body and "새침냥이" in body  # 유형 + 궁합


def test_promo(client, token, bearer, seeded):
    assert client.get("/tests/promo", headers=bearer(token)).get_json()["test"]["slug"] == "love-type"


def test_badge(client, register, bearer, seeded, app):
    tok, uid = register("badgeuser")
    with app.app_context():
        t = Test.query.filter_by(slug="love-type").first()
        res = TestResult.query.filter_by(test_id=t.id, code="RB").first()
        db.session.add(TestAttempt(test_id=t.id, result_id=res.id, user_id=uid))
        db.session.commit()
    badge = client.get("/me/test-badge", headers=bearer(tok)).get_json()["badge"]
    assert badge["code"] == "RB" and badge["avatar_no"] == 1
