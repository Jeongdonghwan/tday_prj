"""속마음이야기(커플 회고 노트) API."""


def _couple(client, register, bearer, a_id="note_a", b_id="note_b"):
    a, _ = register(a_id)
    b, _ = register(b_id)
    code = client.post("/couple/invite", headers=bearer(a)).get_json()["invite_code"]
    assert client.post("/couple/join", json={"code": code}, headers=bearer(b)).status_code == 200
    return a, b


NOTE = {"title": "나트랑 여행 후기", "good": "바다가 예뻤어", "bad": "일정이 빡빡했어", "improve": "다음엔 여유있게"}


def test_requires_couple(client, token, bearer):
    assert client.get("/couple/notes", headers=bearer(token)).status_code == 403
    assert client.post("/couple/notes", json=NOTE, headers=bearer(token)).status_code == 403


def test_create_list_detail_shared(client, register, bearer):
    a, b = _couple(client, register, bearer)
    r = client.post("/couple/notes", json=NOTE, headers=bearer(a))
    assert r.status_code == 201
    note = r.get_json()
    assert note["title"] == NOTE["title"] and note["is_mine"] is True and note["note_date"]

    # 상대(b)에게도 보임 + is_mine False
    lst = client.get("/couple/notes", headers=bearer(b)).get_json()
    assert len(lst["items"]) == 1 and lst["items"][0]["is_mine"] is False
    assert lst["partner"]["nickname"]

    d = client.get(f"/couple/notes/{note['id']}", headers=bearer(b)).get_json()
    assert d["good"] == NOTE["good"] and d["comments"] == []


def test_validation(client, register, bearer):
    a, _ = _couple(client, register, bearer)
    assert client.post("/couple/notes", json={"title": "", "good": "x"}, headers=bearer(a)).status_code == 400
    assert client.post("/couple/notes", json={"title": "t"}, headers=bearer(a)).status_code == 400
    assert client.post("/couple/notes", json={**NOTE, "note_date": "bad"}, headers=bearer(a)).status_code == 400
    ok = client.post("/couple/notes", json={**NOTE, "note_date": "2026-08-01"}, headers=bearer(a)).get_json()
    assert ok["note_date"] == "2026-08-01"


def test_only_author_can_edit_delete(client, register, bearer):
    a, b = _couple(client, register, bearer)
    nid = client.post("/couple/notes", json=NOTE, headers=bearer(a)).get_json()["id"]
    assert client.put(f"/couple/notes/{nid}", json={**NOTE, "title": "수정"}, headers=bearer(b)).status_code == 403
    assert client.delete(f"/couple/notes/{nid}", headers=bearer(b)).status_code == 403
    assert client.put(f"/couple/notes/{nid}", json={**NOTE, "title": "수정"}, headers=bearer(a)).get_json()["title"] == "수정"
    assert client.delete(f"/couple/notes/{nid}", headers=bearer(a)).status_code == 200
    assert client.get(f"/couple/notes/{nid}", headers=bearer(a)).status_code == 404


def test_comments_and_couple_isolation(client, register, bearer):
    a, b = _couple(client, register, bearer)
    nid = client.post("/couple/notes", json=NOTE, headers=bearer(a)).get_json()["id"]
    c = client.post(f"/couple/notes/{nid}/comments", json={"body": "나도 좋았어!"}, headers=bearer(b))
    assert c.status_code == 201 and c.get_json()["is_mine"] is True
    d = client.get(f"/couple/notes/{nid}", headers=bearer(a)).get_json()
    assert d["comment_count"] == 1
    assert d["comments"][0]["body"] == "나도 좋았어!" and d["comments"][0]["is_mine"] is False

    # 다른 커플은 접근 불가
    x, _y = _couple(client, register, bearer, "note_x", "note_y")
    assert client.get(f"/couple/notes/{nid}", headers=bearer(x)).status_code == 404
    assert client.get("/couple/notes", headers=bearer(x)).get_json()["items"] == []
