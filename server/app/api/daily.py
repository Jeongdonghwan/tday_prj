"""오늘의 질문 API (스펙 §7, 5단계). 1인 모드 + 커플 연결 시 답 공개.

  GET  /daily/today
  POST /daily/answer              { answer, question_id? }
  POST /daily/{question_id}/to-post
"""
from datetime import date, timedelta

from flask import Blueprint, g, jsonify, request
from sqlalchemy import select

from ..auth import login_required
from ..extensions import db
from ..models import Couple, DailyAnswer, DailyQuestion, Post, User
from ..push import send_push

bp = Blueprint("daily", __name__)


def _today_question():
    today = date.today()
    q = db.session.scalar(
        select(DailyQuestion).where(DailyQuestion.scheduled_date <= today).order_by(DailyQuestion.scheduled_date.desc())
    )
    return q


def _partner(user) -> User | None:
    if not user.couple_id:
        return None
    couple = db.session.get(Couple, user.couple_id)
    if not couple:
        return None
    other_id = couple.user_b if couple.user_a == user.id else couple.user_a
    return db.session.get(User, other_id) if other_id else None


def _streak(user_id: int) -> int:
    """연속 답변일 수 — 답변한 질문 날짜 기준 오늘(또는 어제)부터 연속."""
    rows = db.session.execute(
        select(DailyQuestion.scheduled_date)
        .join(DailyAnswer, DailyAnswer.question_id == DailyQuestion.id)
        .where(DailyAnswer.user_id == user_id)
    ).all()
    answered = {r[0] for r in rows}
    if not answered:
        return 0
    today = date.today()
    cursor = today if today in answered else today - timedelta(days=1)
    if cursor not in answered:
        return 0
    streak = 0
    while cursor in answered:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


@bp.get("/daily/today")
@login_required
def today():
    q = _today_question()
    if not q:
        return jsonify({"question": None})

    my = db.session.scalar(
        select(DailyAnswer).where(DailyAnswer.question_id == q.id, DailyAnswer.user_id == g.user.id)
    )
    partner = _partner(g.user)
    data = {
        "question": {"id": q.id, "text": q.question, "date": q.scheduled_date.isoformat()},
        "my_answer": my.answer if my else None,
        "streak": _streak(g.user.id),
        "connected": partner is not None,
    }

    if partner:
        p_ans = db.session.scalar(
            select(DailyAnswer).where(DailyAnswer.question_id == q.id, DailyAnswer.user_id == partner.id)
        )
        both = my is not None and p_ans is not None
        data["partner"] = {
            "nickname": partner.nickname,
            "answered": p_ans is not None,
            # 둘 다 답해야 상대 답 공개
            "answer": p_ans.answer if (both and p_ans) else None,
        }

    # 지난 질문 (오늘 제외, 최근 5개) + 내 답변 여부
    past_qs = db.session.scalars(
        select(DailyQuestion).where(DailyQuestion.id != q.id).order_by(DailyQuestion.scheduled_date.desc()).limit(5)
    ).all()
    my_past = {
        a.question_id: a.answer
        for a in db.session.scalars(
            select(DailyAnswer).where(
                DailyAnswer.user_id == g.user.id,
                DailyAnswer.question_id.in_([pq.id for pq in past_qs] or [0]),
            )
        ).all()
    }
    data["past"] = [
        {"id": pq.id, "text": pq.question, "answered": pq.id in my_past} for pq in past_qs
    ]
    return jsonify(data)


@bp.post("/daily/answer")
@login_required
def answer():
    data = request.get_json(silent=True) or {}
    text = (data.get("answer") or "").strip()
    question_id = data.get("question_id")
    if not text:
        return jsonify({"error": "answer_required"}), 400

    q = db.session.get(DailyQuestion, question_id) if question_id else _today_question()
    if not q:
        return jsonify({"error": "no_question"}), 404

    existing = db.session.scalar(
        select(DailyAnswer).where(DailyAnswer.question_id == q.id, DailyAnswer.user_id == g.user.id)
    )
    if existing:
        existing.answer = text  # 수정 허용
    else:
        db.session.add(
            DailyAnswer(question_id=q.id, user_id=g.user.id, couple_id=g.user.couple_id, answer=text)
        )
    db.session.commit()

    # 커플 둘 다 답했으면 양쪽에 푸시 (스펙 §7: 커플 답변 완료)
    partner = _partner(g.user)
    if partner:
        partner_answered = db.session.scalar(
            select(DailyAnswer.id).where(DailyAnswer.question_id == q.id, DailyAnswer.user_id == partner.id)
        )
        if partner_answered:
            send_push(
                [g.user.push_token, partner.push_token],
                "오늘의 질문",
                "둘 다 답했어요! 서로의 답을 확인해보세요.",
                {"type": "daily_both_answered", "question_id": q.id},
            )

    return jsonify({"ok": True, "streak": _streak(g.user.id)})


@bp.post("/daily/<int:question_id>/to-post")
@login_required
def to_post(question_id: int):
    """답 갈린 질문 → 오늘연애 글로 전환 (커플 답을 A/B 투표로)."""
    q = db.session.get(DailyQuestion, question_id)
    if not q:
        return jsonify({"error": "not_found"}), 404

    post = Post(
        user_id=g.user.id,
        category="counsel",
        title=q.question,
        body="오늘의 질문에서 의견이 갈려 글로 가져왔어요.",
        is_poll=False,
        author_status=g.user.relationship_status,
    )
    db.session.add(post)
    db.session.commit()
    db.session.refresh(post)
    return jsonify({"post_id": post.id}), 201
