"""schedules(공유 캘린더) API 회귀 테스트 (api/schedules.py)."""


def _connect(client, register, bearer):
    a, _ = register("schedA")
    b, _ = register("schedB")
    code = client.post("/couple/invite", headers=bearer(a)).get_json()["invite_code"]
    client.post("/couple/join", json={"code": code}, headers=bearer(b))
    return a, b


def test_create_list_delete(client, register, bearer):
    a, b = _connect(client, register, bearer)
    r = client.post(
        "/schedules",
        json={"owner": "both", "title": "성수 데이트", "event_date": "2026-06-11", "event_time": "19:00"},
        headers=bearer(a),
    )
    assert r.status_code == 201
    sid = r.get_json()["id"]

    # 상대도 같은 일정 조회 (월 필터)
    items = client.get("/schedules?month=2026-06", headers=bearer(b)).get_json()["items"]
    assert any(s["id"] == sid for s in items)

    assert client.delete(f"/schedules/{sid}", headers=bearer(a)).status_code == 200


def test_month_filter_excludes_other_months(client, register, bearer):
    a, b = _connect(client, register, bearer)
    client.post("/schedules", json={"owner": "a", "title": "6월", "event_date": "2026-06-05"}, headers=bearer(a))
    client.post("/schedules", json={"owner": "a", "title": "7월", "event_date": "2026-07-05"}, headers=bearer(a))
    items = client.get("/schedules?month=2026-06", headers=bearer(a)).get_json()["items"]
    titles = [s["title"] for s in items]
    assert "6월" in titles and "7월" not in titles


def test_personal_schedule_without_couple(client, register, bearer):
    """커플 미연결이어도 개인 일정 생성·조회·삭제 가능."""
    solo, _ = register("solo")
    r = client.post("/schedules", json={"owner": "a", "title": "혼자 일정", "event_date": "2026-06-01"}, headers=bearer(solo))
    assert r.status_code == 201
    sid = r.get_json()["id"]
    items = client.get("/schedules?month=2026-06", headers=bearer(solo)).get_json()["items"]
    assert any(s["id"] == sid for s in items)
    assert client.delete(f"/schedules/{sid}", headers=bearer(solo)).status_code == 200


def test_personal_schedule_is_private(client, register, bearer):
    """남의 개인 일정은 보이지도, 지워지지도 않는다."""
    a, _ = register("soloA")
    b, _ = register("soloB")
    sid = client.post("/schedules", json={"owner": "a", "title": "A개인", "event_date": "2026-06-02"}, headers=bearer(a)).get_json()["id"]
    assert client.get("/schedules?month=2026-06", headers=bearer(b)).get_json()["items"] == []
    assert client.delete(f"/schedules/{sid}", headers=bearer(b)).status_code == 404
