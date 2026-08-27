"""AI 운세 생성(B안) — 성공 시 AI 본문 사용, 실패 시 폴백 + 알림."""
from datetime import date

from app.fortune import generate as gen
from app.fortune.ai import FortuneAIError, cat_labels
from app.models import DailyFortune

D = date(2030, 1, 15)


def _fake_ai(fortune_date, status, lang="ko"):
    labels = cat_labels(status, lang)
    return {
        i: {
            "summary": f"AI {status} {lang} {i}",
            "full_text": f"AI 본문 {status} {i} " * 5,
            "cats": [{"name": labels[k], "comment": f"c{k}"} for k in range(3)],
        }
        for i in range(12)
    }


def test_ai_used_when_available(app, monkeypatch):
    monkeypatch.setattr(gen, "generate_segments_ai", _fake_ai)
    monkeypatch.setattr(gen, "_AI_RETRY_WAIT", 0)
    with app.app_context():
        n = gen.generate_for_date(D, lang="ko", overwrite=True, ai=True)
        assert n == 48
        rows = DailyFortune.query.filter_by(fortune_date=D, lang="ko").all()
        assert len(rows) == 48 and all(r.is_fallback is False for r in rows)
        r = next(x for x in rows if x.zodiac == 3 and x.love_status == "couple")
        assert r.summary == "AI couple ko 3" and r.cat_labels[0]["name"] == cat_labels("couple", "ko")[0]
        assert (gen.LAST_RUN["ai"], gen.LAST_RUN["fallback"], gen.LAST_RUN["errors"]) == (48, 0, [])


def test_ai_failure_falls_back_with_alert(app, monkeypatch):
    def boom(fortune_date, status, lang="ko"):
        if status == "some":
            raise FortuneAIError("api down")
        return _fake_ai(fortune_date, status, lang)

    alerts = []
    monkeypatch.setattr(gen, "generate_segments_ai", boom)
    monkeypatch.setattr(gen, "_AI_RETRY_WAIT", 0)
    monkeypatch.setattr(gen, "send_alert", lambda t: alerts.append(t) or True)
    with app.app_context():
        assert gen.generate_for_date(D, lang="en", overwrite=True, ai=True) == 48
        rows = DailyFortune.query.filter_by(fortune_date=D, lang="en").all()
        some = [r for r in rows if r.love_status == "some"]
        others = [r for r in rows if r.love_status != "some"]
        assert all(r.is_fallback for r in some) and all(not r.is_fallback for r in others)
        assert (gen.LAST_RUN["ai"], gen.LAST_RUN["fallback"]) == (36, 12)
        assert gen.LAST_RUN["errors"] == ["en/some: api down"]  # 3회 재시도 후 폴백, 사유 기록
    assert len(alerts) == 1 and "some" in alerts[0]


def test_no_key_means_fallback_without_calling_ai(app, monkeypatch):
    called = []
    monkeypatch.setattr(gen, "generate_segments_ai", lambda *a, **k: called.append(1) or _fake_ai(*a, **k))
    with app.app_context():
        app.config["ANTHROPIC_API_KEY"] = ""
        gen.generate_for_date(D, lang="ko", overwrite=True)  # ai=None → 키 없으면 자동 폴백
        assert called == []
        assert all(r.is_fallback for r in DailyFortune.query.filter_by(fortune_date=D, lang="ko").all())
