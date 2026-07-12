"""3~6단계 API in-process 스모크 테스트 (셸 인코딩 문제 회피).
실행:  .venv/Scripts/python.exe scripts/smoke.py
"""
import os
import sys
import uuid

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from app import create_app  # noqa: E402
from app.ranking import recompute_hot_scores  # noqa: E402

app = create_app()
c = app.test_client()


def login(social_id):
    r = c.post("/auth/social", json={"provider": "dev", "social_id": social_id})
    d = r.get_json()
    return d["token"], d["user"]["id"]


def auth(token):
    return {"Authorization": f"Bearer {token}"}


def stage3(tok):
    print("\n--- 3단계: 글/투표/댓글 ---")
    r = c.post("/posts", json={"category": "free", "title": "오늘 점심 뭐 먹지", "body": "고민"}, headers=auth(tok))
    assert r.status_code == 201, r.get_json()
    plain_id = r.get_json()["id"]

    r = c.post("/posts", json={"category": "love", "title": "짜장 vs 짬뽕", "is_poll": True, "poll": {"a": "짜장", "b": "짬뽕"}}, headers=auth(tok))
    poll_id = r.get_json()["id"]
    print(f"글 작성 OK (일반 {plain_id}, 투표 {poll_id})")

    r = c.post(f"/posts/{poll_id}/vote", json={"side": "A"}, headers=auth(tok))
    assert r.status_code == 200 and r.get_json()["poll"]["my_vote"] == "A"
    r = c.post(f"/posts/{poll_id}/vote", json={"side": "B"}, headers=auth(tok))
    assert r.status_code == 409
    print("투표 + 중복차단(409) OK")

    r = c.post(f"/posts/{poll_id}/comments", json={"body": "난 짬뽕"}, headers=auth(tok))
    cid = r.get_json()["id"]
    c.post(f"/posts/{poll_id}/comments", json={"body": "난 짜장", "parent_id": cid}, headers=auth(tok))
    r = c.get(f"/posts/{poll_id}/comments")
    assert r.get_json()["items"][0]["reply_count"] == 1
    print("댓글 + 대댓글 OK")
    return poll_id


def stage4(tok):
    print("\n--- 4단계: BEST / 신고 / 차단 ---")
    with app.app_context():
        recompute_hot_scores()
    for period in ("realtime", "today", "weekly"):
        r = c.get(f"/best?period={period}")
        assert r.status_code == 200, period
        print(f"BEST {period}: {len(r.get_json()['items'])}건")
    r = c.get("/best/comments")
    print(f"베스트 댓글: {len(r.get_json()['items'])}건")

    # 신고 누적 → 자동 가림
    r = c.post("/posts", json={"category": "free", "title": "신고당할 글"}, headers=auth(tok))
    bad_id = r.get_json()["id"]
    blinded = False
    for _ in range(5):
        rr = c.post("/reports", json={"target_type": "post", "target_id": bad_id, "reason": "spam"}, headers=auth(tok))
        blinded = rr.get_json().get("blinded") or blinded
    assert blinded, "5회 신고 후 자동 가림 안 됨"
    assert c.get(f"/posts/{bad_id}", headers=auth(tok)).status_code == 404
    print("신고 5회 → 자동 가림(블라인드) OK")

    # 차단 → 피드 제외
    other_tok, other_id = login("blockme")
    r = c.post("/posts", json={"category": "free", "title": "차단될 유저 글"}, headers=auth(other_tok))
    other_post = r.get_json()["id"]
    c.post("/blocks", json={"blocked_user_id": other_id}, headers=auth(tok))
    feed_ids = [p["id"] for p in c.get("/posts?limit=50", headers=auth(tok)).get_json()["items"]]
    assert other_post not in feed_ids, "차단 유저 글이 피드에 남음"
    blocks = c.get("/blocks", headers=auth(tok)).get_json()["items"]
    assert any(b["user_id"] == other_id for b in blocks)
    bid = next(b["block_id"] for b in blocks if b["user_id"] == other_id)
    assert c.delete(f"/blocks/{bid}", headers=auth(tok)).status_code == 200
    print("차단 → 피드 제외 + 목록 + 해제 OK")


def stage5(tok):
    print("\n--- 5단계: 오늘의 질문 (1인 모드) ---")
    r = c.get("/daily/today", headers=auth(tok))
    d = r.get_json()
    assert d["question"], "오늘 질문 없음 (seed 필요)"
    qid = d["question"]["id"]
    print(f"오늘 질문: '{d['question']['text'][:20]}' streak={d['streak']} connected={d['connected']}")

    r = c.post("/daily/answer", json={"answer": "내가 먼저 한다"}, headers=auth(tok))
    assert r.status_code == 200 and r.get_json()["streak"] >= 1
    d2 = c.get("/daily/today", headers=auth(tok)).get_json()
    assert d2["my_answer"] == "내가 먼저 한다"
    print(f"답변 저장 OK streak={d2['streak']} past={len(d2['past'])}개")

    r = c.post(f"/daily/{qid}/to-post", headers=auth(tok))
    assert r.status_code == 201 and r.get_json()["post_id"]
    print("질문 → 오늘연애 전환 OK")


def stage6():
    print("\n--- 6단계: 커플 연결 / 캘린더 / D-day ---")
    a_tok, a_id = login(f"coupleA-{uuid.uuid4().hex[:8]}")
    b_tok, b_id = login(f"coupleB-{uuid.uuid4().hex[:8]}")

    code = c.post("/couple/invite", headers=auth(a_tok)).get_json()["invite_code"]
    assert len(code) == 6
    r = c.post("/couple/join", json={"code": code}, headers=auth(b_tok))
    assert r.status_code == 200, r.get_json()
    print(f"초대코드 {code} → 연결 OK (partner={r.get_json()['partner']})")

    # 본인 코드 / 만료 케이스
    assert c.post("/couple/join", json={"code": code}, headers=auth(a_tok)).status_code in (400, 409)

    r = c.patch("/couple/start-date", json={"date": "2025-07-17"}, headers=auth(a_tok))
    assert r.status_code == 200
    dd = c.get("/couple/dday", headers=auth(b_tok)).get_json()
    assert dd["connected"] and dd["days"] > 0 and dd["next"]
    print(f"D-day OK: {dd['days']}일째, 다음 {dd['next']['label']} D-{dd['next']['d_day']}")

    r = c.post("/schedules", json={"owner": "both", "title": "성수 데이트", "event_date": "2026-06-11", "event_time": "19:00"}, headers=auth(a_tok))
    assert r.status_code == 201
    sid = r.get_json()["id"]
    items = c.get("/schedules?month=2026-06", headers=auth(b_tok)).get_json()["items"]
    assert any(s["id"] == sid for s in items)
    assert c.delete(f"/schedules/{sid}", headers=auth(a_tok)).status_code == 200
    print(f"일정 추가/조회/삭제 OK (월 {len(items)}건)")


def stage_profile(tok):
    print("\n--- 프로필: 상태 전환 / 푸시 토큰 ---")
    r = c.patch("/me", json={"relationship_status": "married", "push_token": "ExponentPushToken[xxx]"}, headers=auth(tok))
    assert r.status_code == 200 and r.get_json()["relationship_status"] == "married"
    c.patch("/me", json={"relationship_status": "single"}, headers=auth(tok))  # 원복
    print("PATCH /me 상태/푸시토큰 OK")


def main():
    tok, _ = login("tester1")
    stage3(tok)
    stage4(tok)
    stage5(tok)
    stage6()
    stage_profile(tok)
    print("\n✅ 3~6단계 + 프로필 API 스모크 전부 통과")


if __name__ == "__main__":
    main()
