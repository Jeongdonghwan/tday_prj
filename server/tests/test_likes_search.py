"""공감 토글 + 글 검색 회귀."""


def _post(client, headers, title="t", body=None):
    return client.post("/posts", json={"category": "free", "title": title, "body": body}, headers=headers).get_json()["id"]


def test_like_toggle(client, token, bearer):
    pid = _post(client, bearer(token))
    r1 = client.post(f"/posts/{pid}/like", headers=bearer(token)).get_json()
    assert r1["liked"] is True and r1["like_count"] == 1
    r2 = client.post(f"/posts/{pid}/like", headers=bearer(token)).get_json()
    assert r2["liked"] is False and r2["like_count"] == 0


def test_like_state_in_detail(client, token, bearer):
    pid = _post(client, bearer(token))
    client.post(f"/posts/{pid}/like", headers=bearer(token))
    d = client.get(f"/posts/{pid}", headers=bearer(token)).get_json()
    assert d["liked"] is True and d["like_count"] == 1


def test_like_counts_once_per_user(client, token, bearer, register):
    pid = _post(client, bearer(token))
    other, _ = register("liker2")
    client.post(f"/posts/{pid}/like", headers=bearer(token))
    client.post(f"/posts/{pid}/like", headers=bearer(other))
    client.post(f"/posts/{pid}/like", headers=bearer(token))  # 토글 해제
    d = client.get(f"/posts/{pid}", headers=bearer(other)).get_json()
    assert d["like_count"] == 1  # other 만 남음


def test_search_title_and_body(client, token, bearer):
    _post(client, bearer(token), title="축의금 얼마가 적당")
    _post(client, bearer(token), title="데이트 코스", body="놀이공원 갈까")
    titles = [p["title"] for p in client.get("/posts?q=축의금", headers=bearer(token)).get_json()["items"]]
    assert titles == ["축의금 얼마가 적당"]
    hits = client.get("/posts?q=놀이공원", headers=bearer(token)).get_json()["items"]
    assert len(hits) == 1 and hits[0]["title"] == "데이트 코스"
