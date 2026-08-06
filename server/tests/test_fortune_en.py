"""영어권(en) 운세 회귀 테스트 (글로벌 확장 Phase 1-5)."""
from app.fortune.kst import kst_today


def _gen(app, lang):
    from app.fortune.generate import generate_for_date
    with app.app_context():
        return generate_for_date(kst_today(), lang=lang, overwrite=True)


def _en_user(client):
    return client.post("/auth/social", json={"provider": "dev", "social_id": "enfortune", "locale": "en-US"}).get_json()


def _profile(client, bearer, token, **over):
    body = {"birth_date": "1998-08-10", "gender": "F", "love_status": "couple", "push_enabled": False}
    body.update(over)
    return client.post("/fortune/profile", json=body, headers=bearer(token))


def test_generate_en_48(app):
    assert _gen(app, "en") == 48


def test_en_and_ko_coexist(app):
    # 같은 날짜에 ko/en 각각 48 → 유니크 제약(+lang)로 공존
    from app.models import DailyFortune
    _gen(app, "ko")
    _gen(app, "en")
    with app.app_context():
        assert DailyFortune.query.filter_by(fortune_date=kst_today(), lang="ko").count() == 48
        assert DailyFortune.query.filter_by(fortune_date=kst_today(), lang="en").count() == 48


def test_en_user_gets_english_fortune(client, app, bearer):
    _gen(app, "en")
    en = _en_user(client)
    tok = en["token"]
    assert en["user"]["lang"] == "en"
    # birth 1998-08-10 → Leo (index 4)
    d = _profile(client, bearer, tok).get_json()
    assert d["zodiac"] == "Leo"
    # 영어 콘텐츠(요약이 ASCII 위주인지 대략 확인) + 행운 아이템 영어명
    assert d["summary"].isascii()
    assert d["lucky"]["color"]["name"].isascii()
    assert d["tarot"]["name_en"].isascii()


def test_en_user_no_ko_leak(client, app, bearer):
    # en 세그먼트만 생성하고 ko 는 생성 안 함 → en 유저는 정상, ko 세그먼트 부재와 무관
    _gen(app, "en")
    en = _en_user(client)
    d = _profile(client, bearer, en["token"]).get_json()
    assert d["registered"] is True and not d.get("unavailable")
    assert d["summary"].isascii()
