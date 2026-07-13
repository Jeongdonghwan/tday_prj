"""Flask 웹 관리자 (DESIGN_UPDATE §5·§6 + 확장). ADMIN_TOKEN 게이트.

접근: /admin?token=<ADMIN_TOKEN>  (폼 submit 시 token hidden 유지)
- 오늘의 연애 이슈 등록 (등록 시 이전 이슈 자동 비활성)
- 오늘의 질문(데일리 폴) 등록 (등록 시 이전 폴 자동 비활성)
- 테스트 목록/활성화
- 통계: 총계 + 최근 14일 가입자 (방문자 추적 없음 — 경량)
- 회원관리: 목록/검색 + 제재(콘텐츠 일괄 블라인드/복구)
"""
from datetime import datetime, timedelta

from flask import Blueprint, abort, current_app, redirect, render_template, request, url_for
from sqlalchemy import func, select

from .extensions import db
from .models import Comment, DailyPoll, Issue, Post, Test, User, Vote
from .services.daily_poll import create_daily_poll
from .services.issues import create_issue

bp = Blueprint("admin", __name__)


def _check_token():
    token = request.values.get("token", "")
    if token != current_app.config.get("ADMIN_TOKEN"):
        abort(401)
    return token


def _stats():
    totals = {
        "users": db.session.scalar(select(func.count(User.id))) or 0,
        "posts": db.session.scalar(select(func.count(Post.id))) or 0,
        "comments": db.session.scalar(select(func.count(Comment.id))) or 0,
        "votes": db.session.scalar(select(func.count(Vote.id))) or 0,
    }
    # 최근 14일 일자별 가입자
    since = datetime.utcnow().date() - timedelta(days=13)
    rows = db.session.execute(
        select(func.date(User.created_at), func.count(User.id))
        .where(User.created_at >= datetime.combine(since, datetime.min.time()))
        .group_by(func.date(User.created_at))
    ).all()
    by_day = {str(d): int(c) for d, c in rows}
    signups = []
    for i in range(14):
        day = since + timedelta(days=i)
        signups.append({"date": day.isoformat(), "count": by_day.get(day.isoformat(), 0)})
    return totals, signups


def _members(q):
    uq = select(User).order_by(User.created_at.desc())
    if q:
        uq = uq.where(User.nickname.contains(q))
    users = db.session.scalars(uq.limit(50)).all()
    post_counts = dict(db.session.execute(select(Post.user_id, func.count(Post.id)).group_by(Post.user_id)).all())
    cmt_counts = dict(db.session.execute(select(Comment.user_id, func.count(Comment.id)).group_by(Comment.user_id)).all())
    blinded_posts = dict(
        db.session.execute(
            select(Post.user_id, func.count(Post.id)).where(Post.is_blinded.is_(True)).group_by(Post.user_id)
        ).all()
    )
    return [
        {
            "u": u,
            "posts": int(post_counts.get(u.id, 0)),
            "comments": int(cmt_counts.get(u.id, 0)),
            "sanctioned": int(blinded_posts.get(u.id, 0)) > 0,
        }
        for u in users
    ]


@bp.get("/admin")
def dashboard():
    token = _check_token()
    q = (request.args.get("q") or "").strip()
    totals, signups = _stats()
    return render_template(
        "admin.html",
        token=token,
        issues=db.session.query(Issue).order_by(Issue.created_at.desc()).limit(10).all(),
        tests=db.session.query(Test).order_by(Test.created_at.desc()).all(),
        polls=db.session.query(DailyPoll).order_by(DailyPoll.created_at.desc()).limit(10).all(),
        totals=totals,
        signups=signups,
        members=_members(q),
        q=q,
        flash=request.args.get("flash"),
    )


@bp.post("/admin/issues")
def add_issue():
    token = _check_token()
    f = request.form
    if not f.get("title") or not f.get("summary") or not f.get("poll_option_a") or not f.get("poll_option_b"):
        return redirect(url_for("admin.dashboard", token=token, flash="필수 항목을 입력하세요."))
    create_issue(
        title=f["title"].strip(),
        summary=f["summary"].strip(),
        source=(f.get("source") or "").strip() or None,
        url=(f.get("url") or "").strip() or None,
        poll_option_a=f["poll_option_a"].strip(),
        poll_option_b=f["poll_option_b"].strip(),
    )
    return redirect(url_for("admin.dashboard", token=token, flash="이슈를 등록했어요 (이전 이슈 비활성)."))


@bp.post("/admin/daily-poll")
def add_daily_poll():
    token = _check_token()
    f = request.form
    if not f.get("question") or not f.get("choice_a") or not f.get("choice_b"):
        return redirect(url_for("admin.dashboard", token=token, flash="질문과 A/B 선택지를 입력하세요."))
    create_daily_poll(
        question=f["question"].strip(),
        choice_a=f["choice_a"].strip(),
        choice_b=f["choice_b"].strip(),
        choice_c=(f.get("choice_c") or "").strip() or None,
    )
    return redirect(url_for("admin.dashboard", token=token, flash="오늘의 질문을 등록했어요 (이전 질문 비활성)."))


@bp.post("/admin/tests/<int:test_id>/activate")
def toggle_test(test_id):
    token = _check_token()
    test = db.session.get(Test, test_id)
    if test:
        test.is_active = not test.is_active
        db.session.commit()
    return redirect(url_for("admin.dashboard", token=token, flash="테스트 상태를 변경했어요."))


@bp.post("/admin/users/<int:user_id>/moderate")
def moderate_user(user_id):
    """회원 제재 — 해당 회원의 글/댓글을 일괄 블라인드/복구 (기존 is_blinded 활용)."""
    token = _check_token()
    blinded = request.form.get("op") == "blind"
    Post.query.filter_by(user_id=user_id).update({"is_blinded": blinded})
    Comment.query.filter_by(user_id=user_id).update({"is_blinded": blinded})
    db.session.commit()
    verb = "블라인드" if blinded else "복구"
    return redirect(url_for("admin.dashboard", token=token, flash=f"회원 #{user_id} 콘텐츠를 {verb}했어요."))
