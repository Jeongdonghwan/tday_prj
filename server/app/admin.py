"""Flask 웹 관리자 (DESIGN_UPDATE §5·§6). ADMIN_TOKEN 게이트.

접근: /admin?token=<ADMIN_TOKEN>  (폼 submit 시 token hidden 유지)
- 오늘의 이슈 등록 (등록 시 이전 이슈 자동 비활성)
- 테스트 목록/활성화
"""
from flask import Blueprint, abort, current_app, redirect, render_template, request, url_for

from .extensions import db
from .models import Issue, Test
from .services.issues import create_issue

bp = Blueprint("admin", __name__)


def _check_token():
    token = request.values.get("token", "")
    if token != current_app.config.get("ADMIN_TOKEN"):
        abort(401)
    return token


@bp.get("/admin")
def dashboard():
    token = _check_token()
    issues = db.session.query(Issue).order_by(Issue.created_at.desc()).limit(10).all()
    tests = db.session.query(Test).order_by(Test.created_at.desc()).all()
    return render_template("admin.html", token=token, issues=issues, tests=tests, flash=request.args.get("flash"))


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


@bp.post("/admin/tests/<int:test_id>/activate")
def toggle_test(test_id):
    token = _check_token()
    test = db.session.get(Test, test_id)
    if test:
        test.is_active = not test.is_active
        db.session.commit()
    return redirect(url_for("admin.dashboard", token=token, flash="테스트 상태를 변경했어요."))
