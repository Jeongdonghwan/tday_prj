"""심리테스트 앱 연동 JSON API (DESIGN_UPDATE §6).

  GET /tests/promo      출시 7일 내 활성 테스트 (피드 홍보 카드용)
  GET /me/test-badge    내 최근 결과 유형 (프로필 뱃지용)
"""
from datetime import datetime, timedelta

from flask import Blueprint, g, jsonify
from sqlalchemy import select

from ..auth import login_required
from ..extensions import db
from ..models import Test, TestAttempt, TestResult

bp = Blueprint("tests_api", __name__)


@bp.get("/tests/promo")
@login_required
def promo():
    since = datetime.utcnow() - timedelta(days=7)
    test = db.session.scalar(
        select(Test)
        .where(Test.is_active.is_(True), Test.created_at >= since)
        .order_by(Test.created_at.desc())
    )
    if not test:
        return jsonify({"test": None})
    return jsonify({"test": {"slug": test.slug, "title": test.title}})


@bp.get("/me/test-badge")
@login_required
def test_badge():
    attempt = db.session.scalar(
        select(TestAttempt).where(TestAttempt.user_id == g.user.id).order_by(TestAttempt.created_at.desc())
    )
    if not attempt:
        return jsonify({"badge": None})
    result = db.session.get(TestResult, attempt.result_id)
    if not result:
        return jsonify({"badge": None})
    return jsonify({"badge": {"code": result.code, "title": result.title, "avatar_no": result.avatar_no}})
