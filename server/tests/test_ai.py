"""AI 선택지 제안 API (api/ai.py, services/ai.py) — TDD."""


class _Content:
    def __init__(self, text):
        self.text = text


class _Resp:
    def __init__(self, text):
        self.content = [_Content(text)]


class _Messages:
    def create(self, **kw):
        return _Resp('{"a": "여친이 서운한 게 당연", "b": "너무 예민한 듯"}')


class FakeAnthropic:
    def __init__(self, *a, **k):
        self.messages = _Messages()


def test_poll_suggest_unavailable_without_key(client, token, bearer):
    # TestConfig 는 키가 비어 있음 → 503
    r = client.post("/ai/poll-suggest", json={"title": "기념일 까먹은 남친"}, headers=bearer(token))
    assert r.status_code == 503


def test_poll_suggest_requires_title(client, token, bearer):
    r = client.post("/ai/poll-suggest", json={"title": "  "}, headers=bearer(token))
    assert r.status_code == 400


def test_poll_suggest_returns_two_options(client, token, bearer, monkeypatch):
    client.application.config["ANTHROPIC_API_KEY"] = "test-key"
    monkeypatch.setattr("app.services.ai.Anthropic", FakeAnthropic)
    r = client.post("/ai/poll-suggest", json={"title": "기념일 까먹은 남친", "body": "..."}, headers=bearer(token))
    assert r.status_code == 200
    d = r.get_json()
    assert d["a"] == "여친이 서운한 게 당연"
    assert d["b"] == "너무 예민한 듯"
    client.application.config["ANTHROPIC_API_KEY"] = ""


def test_poll_suggest_requires_auth(client):
    assert client.post("/ai/poll-suggest", json={"title": "x"}).status_code == 401
