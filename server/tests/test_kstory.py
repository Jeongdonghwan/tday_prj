"""K-Story 파이프라인 테스트 (글로벌 확장 Phase 2). Claude 호출은 monkeypatch."""
from datetime import datetime

import pytest


def _mk_user(app, social_id, lang="ko", agreed=True):
    from app.extensions import db
    from app.models import User

    with app.app_context():
        u = User(
            nickname=f"n_{social_id}", social_provider="dev", social_id=social_id,
            relationship_status="single", lang=lang,
            terms_v2_agreed_at=datetime.utcnow() if agreed else None,
        )
        db.session.add(u)
        db.session.commit()
        return u.id


def _mk_post(app, user_id, likes=0, comments=0, lang="ko", post_type="user"):
    from app.extensions import db
    from app.models import Post

    with app.app_context():
        p = Post(
            user_id=user_id, category="love", title="원본글", body="사연 본문",
            author_status="single", like_count=likes, comment_count=comments,
            lang=lang, post_type=post_type,
        )
        db.session.add(p)
        db.session.commit()
        return p.id


def _count(app, **filt):
    from app.models import KStoryCandidate
    with app.app_context():
        return KStoryCandidate.query.filter_by(**filt).count()


# --- 후보 선정 ---
def test_select_by_threshold_and_consent(app):
    from app.services.kstory import select_candidates

    uid = _mk_user(app, "author1", agreed=True)
    _mk_post(app, uid, likes=25)            # 공감 임계 충족 → 후보
    _mk_post(app, uid, comments=15)         # 댓글 임계 충족 → 후보
    _mk_post(app, uid, likes=1, comments=1)  # 미달 → 제외
    with app.app_context():
        n = select_candidates()
    assert n == 2


def test_select_excludes_unconsented_author(app):
    from app.services.kstory import select_candidates

    uid = _mk_user(app, "noconsent", agreed=False)
    _mk_post(app, uid, likes=99)  # 인기지만 작성자 미동의 → 제외
    with app.app_context():
        assert select_candidates() == 0


def test_select_excludes_en_and_reported(app):
    from app.extensions import db
    from app.models import Report
    from app.services.kstory import select_candidates

    uid = _mk_user(app, "mixed", agreed=True)
    _mk_post(app, uid, likes=30, lang="en")   # en 원본 → 제외
    pid = _mk_post(app, uid, likes=30)         # ko 인기지만 신고됨 → 제외
    with app.app_context():
        db.session.add(Report(target_type="post", target_id=pid, reporter_id=uid, reason="x"))
        db.session.commit()
        assert select_candidates() == 0


def test_select_idempotent(app):
    from app.services.kstory import select_candidates

    uid = _mk_user(app, "dup", agreed=True)
    _mk_post(app, uid, likes=30)
    with app.app_context():
        assert select_candidates() == 1
        assert select_candidates() == 0  # 이미 후보 → 재등록 안 함


# --- 번역 (Claude mock) ---
def test_translate_pending(app, monkeypatch):
    from app.services import kstory
    from app.services.kstory import select_candidates, translate_pending

    uid = _mk_user(app, "tr", agreed=True)
    _mk_post(app, uid, likes=30)
    monkeypatch.setattr(
        kstory, "translate_post",
        lambda title, body: {"title": "Translated", "body": "English body", "note": "anonymized"},
    )
    with app.app_context():
        select_candidates()
        r = translate_pending()
    assert r == {"ok": 1, "failed": 0}
    assert _count(app, status="translated") == 1


def test_translate_failure_alerts(app, monkeypatch):
    from app.services import kstory
    from app.services.kstory import KStoryTranslateError, select_candidates, translate_pending

    uid = _mk_user(app, "trf", agreed=True)
    _mk_post(app, uid, likes=30)
    alerts = []
    monkeypatch.setattr(kstory, "send_alert", lambda msg: alerts.append(msg), raising=False)
    def _boom(title, body):
        raise KStoryTranslateError("no key")
    monkeypatch.setattr(kstory, "translate_post", _boom)
    with app.app_context():
        select_candidates()
        r = translate_pending()
    assert r["failed"] == 1


# --- 발행 + cap ---
def test_publish_respects_cap(app, monkeypatch):
    from app.extensions import db
    from app.models import KStoryCandidate, Post
    from app.services import kstory
    from app.services.kstory import publish_approved, select_candidates, translate_pending

    uid = _mk_user(app, "pub", agreed=True)
    for _ in range(5):
        _mk_post(app, uid, likes=30)
    monkeypatch.setattr(kstory, "translate_post", lambda t, b: {"title": "T", "body": "B", "note": ""})
    with app.app_context():
        select_candidates()
        translate_pending()
        # 전부 승인
        for c in KStoryCandidate.query.filter_by(status="translated").all():
            c.status = "approved"
        db.session.commit()
        n = publish_approved(cap=2)
        assert n == 2
        pubs = Post.query.filter_by(post_type="kstory", lang="en").all()
        assert len(pubs) == 2
        assert all(p.source_post_id for p in pubs)


# --- 원본 삭제 → 비공개 ---
def test_unpublish_on_source_delete(app, monkeypatch):
    from app.extensions import db
    from app.models import KStoryCandidate, Post
    from app.services import kstory
    from app.services.kstory import publish_approved, select_candidates, translate_pending, sync_deleted

    uid = _mk_user(app, "del", agreed=True)
    src = _mk_post(app, uid, likes=30)
    monkeypatch.setattr(kstory, "translate_post", lambda t, b: {"title": "T", "body": "B", "note": ""})
    with app.app_context():
        select_candidates()
        translate_pending()
        for c in KStoryCandidate.query.filter_by(status="translated").all():
            c.status = "approved"
        db.session.commit()
        publish_approved()
        # 원본 삭제 후 sync
        db.session.delete(db.session.get(Post, src))
        db.session.commit()
        n = sync_deleted()
        assert n == 1
        assert Post.query.filter_by(post_type="kstory").first().is_blinded is True


def test_operator_idempotent(app):
    from app.services.kstory import get_or_create_operator

    with app.app_context():
        a = get_or_create_operator()
        b = get_or_create_operator()
        assert a.id == b.id and a.nickname == "K-Story"


# --- 약관 재동의 API ---
def test_terms_agree(client, app, token, bearer):
    me = client.get("/me", headers=bearer(token)).get_json()
    assert me["terms_v2_agreed_at"] is None
    r = client.post("/me/terms-agree", headers=bearer(token))
    assert r.status_code == 200 and r.get_json()["terms_v2_agreed_at"]
    me2 = client.get("/me", headers=bearer(token)).get_json()
    assert me2["terms_v2_agreed_at"] is not None
