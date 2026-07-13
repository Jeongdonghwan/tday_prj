"""심리테스트존 웹 (DESIGN_UPDATE §6, Jinja). 공유 링크 랜딩 = 비유저 유입 퍼널.

  GET  /t                     테스트 목록
  GET  /t/<slug>              인트로
  GET  /t/<slug>/quiz         문항 플로우(진행바, 클라 JS)
  POST /t/<slug>/submit       { answers:[code...], ref? } → { result_code }  (attempt 기록)
  GET  /t/<slug>/result/<code> 결과 페이지 (OG 공유)
"""
import uuid

from flask import Blueprint, abort, current_app, jsonify, render_template, request

from .extensions import db
from .models import Test, TestAttempt, TestQuestion, TestResult
from .seeds.love_tests import DEFAULT_THEME, THEMES
from .services.psych import score

bp = Blueprint("web", __name__)


def _theme(slug):
    return THEMES.get(slug, DEFAULT_THEME)


def _test_or_404(slug):
    t = db.session.query(Test).filter_by(slug=slug).first()
    if not t:
        abort(404)
    return t


@bp.get("/t")
def test_list():
    tests = db.session.query(Test).filter_by(is_active=True).order_by(Test.created_at.desc()).all()
    return render_template("t_list.html", tests=tests, themes=THEMES, default_theme=DEFAULT_THEME)


@bp.get("/t/<slug>")
def test_intro(slug):
    return render_template("t_intro.html", test=_test_or_404(slug), th=_theme(slug), ref=request.args.get("ref"))


@bp.get("/t/<slug>/quiz")
def test_quiz(slug):
    t = _test_or_404(slug)
    questions = [
        {
            "question": q.question,
            "choices": [c for c in [
                {"text": q.choice1, "code": q.choice1_code},
                {"text": q.choice2, "code": q.choice2_code},
                ({"text": q.choice3, "code": q.choice3_code} if q.choice3 else None),
            ] if c],
        }
        for q in t.questions
    ]
    return render_template("t_quiz.html", test=t, questions=questions, th=_theme(slug), ref=request.args.get("ref"))


@bp.post("/t/<slug>/submit")
def test_submit(slug):
    t = _test_or_404(slug)
    data = request.get_json(silent=True) or {}
    answers = data.get("answers") or []
    ref = (data.get("ref") or None)
    app_uid = data.get("app_uid")  # 앱 WebView 에서 넘기면 뱃지 연동

    results = {r.code: r for r in t.results}
    winner = score(answers, set(results.keys()), (t.tiebreak or "").split(","))
    if not winner or winner not in results:
        winner = next(iter(results)) if results else None
    if not winner:
        abort(400)

    db.session.add(TestAttempt(
        test_id=t.id,
        anon_uuid=str(uuid.uuid4()),
        user_id=int(app_uid) if app_uid else None,
        result_id=results[winner].id,
        ref=ref,
    ))
    db.session.commit()
    return jsonify({"result_code": winner})


@bp.get("/t/<slug>/result/<code>")
def test_result(slug, code):
    t = _test_or_404(slug)
    result = db.session.query(TestResult).filter_by(test_id=t.id, code=code).first()
    if not result:
        abort(404)
    by_code = {r.code: r for r in t.results}
    others = [r for r in t.results if r.code != code]
    return render_template(
        "t_result.html",
        test=t,
        result=result,
        th=_theme(slug),
        match=by_code.get(result.match_code),
        clash=by_code.get(result.clash_code),
        others=others,
        ref=request.args.get("ref"),
        app_install_url=current_app.config.get("APP_INSTALL_URL", "#"),
    )
