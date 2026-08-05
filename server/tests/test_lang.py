"""언어권(lang) 분리 회귀 테스트 (글로벌 확장 Phase 1)."""


def _social(client, social_id, locale=None):
    body = {"provider": "dev", "social_id": social_id}
    if locale is not None:
        body["locale"] = locale
    return client.post("/auth/social", json=body).get_json()


def _create(client, headers, **over):
    body = {"category": "free", "title": "t", "body": "b"}
    body.update(over)
    return client.post("/posts", json=body, headers=headers)


# --- 가입 시 언어 결정 ---
def test_signup_lang_from_locale(client):
    assert _social(client, "en1", "en-US")["user"]["lang"] == "en"
    assert _social(client, "ko1", "ko-KR")["user"]["lang"] == "ko"
    assert _social(client, "no1")["user"]["lang"] == "ko"  # locale 미제공 → ko(무변경)
    assert _social(client, "fr1", "fr-FR")["user"]["lang"] == "en"  # ko 외 전부 en


# --- 피드 언어권 격리 ---
def test_feed_isolated_by_lang(client, bearer):
    ko = _social(client, "kouser", "ko-KR")
    en = _social(client, "enuser", "en-US")
    _create(client, bearer(ko["token"]), title="한국글")
    _create(client, bearer(en["token"]), title="english post")

    ko_items = client.get("/posts", headers=bearer(ko["token"])).get_json()["items"]
    en_items = client.get("/posts", headers=bearer(en["token"])).get_json()["items"]
    assert [p["title"] for p in ko_items] == ["한국글"]
    assert [p["title"] for p in en_items] == ["english post"]
    assert all(p["lang"] == "ko" for p in ko_items)
    assert all(p["lang"] == "en" for p in en_items)


def test_create_post_stamps_author_lang(client, bearer):
    en = _social(client, "enstamp", "en-US")
    d = _create(client, bearer(en["token"]), title="mine").get_json()
    assert d["lang"] == "en" and d["post_type"] == "user"


# --- 게스트: Accept-Language ---
def test_guest_feed_by_accept_language(client, bearer):
    ko = _social(client, "kg", "ko-KR")
    en = _social(client, "eg", "en-US")
    _create(client, bearer(ko["token"]), title="게스트한국")
    _create(client, bearer(en["token"]), title="guest english")

    en_guest = client.get("/posts", headers={"Accept-Language": "en-US,en"}).get_json()["items"]
    ko_guest = client.get("/posts").get_json()["items"]  # 헤더 없음 → ko 기본
    assert [p["title"] for p in en_guest] == ["guest english"]
    assert [p["title"] for p in ko_guest] == ["게스트한국"]


# --- 설정에서 언어 전환 ---
def test_switch_lang_changes_feed(client, bearer):
    ko = _social(client, "kosw", "ko-KR")
    en = _social(client, "ensw", "en-US")
    _create(client, bearer(ko["token"]), title="스위치한국")
    _create(client, bearer(en["token"]), title="switch english")

    # ko 유저가 en 으로 전환 → en 피드
    r = client.patch("/me", json={"lang": "en"}, headers=bearer(ko["token"]))
    assert r.get_json()["lang"] == "en"
    items = client.get("/posts", headers=bearer(ko["token"])).get_json()["items"]
    assert [p["title"] for p in items] == ["switch english"]


def test_switch_lang_validation(client, bearer, token):
    assert client.patch("/me", json={"lang": "jp"}, headers=bearer(token)).status_code == 400
