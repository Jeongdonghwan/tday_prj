"""속마음이야기 API — 커플 전용 회고 노트. 모두 로그인 + 커플 연결 필수.

  GET    /couple/notes                 커플 타임라인 (둘의 글, 최신순)
  POST   /couple/notes                 작성 {title, good, bad, improve, note_date?} → 상대 푸시
  GET    /couple/notes/<id>            상세 + 답글
  PUT    /couple/notes/<id>            수정 (작성자만)
  DELETE /couple/notes/<id>            삭제 (작성자만)
  POST   /couple/notes/<id>/comments   답글 {body} → 글쓴이 푸시
"""
from datetime import datetime

from flask import Blueprint, g, jsonify, request
from sqlalchemy import select

from ..auth import login_required
from ..extensions import db
from ..fortune.kst import kst_today
from ..models import CoupleNote, CoupleNoteComment
from ..push import send_push
from .daily import _partner
from .serializers import time_ago

bp = Blueprint("couple_notes", __name__)

TITLE_MAX = 80
BODY_MAX = 2000


def _user_dict(u) -> dict:
    return {"id": u.id, "nickname": u.nickname, "avatar_no": u.avatar()}


def _comment_dict(c) -> dict:
    return {
        "id": c.id,
        "author": _user_dict(c.author),
        "is_mine": c.author_id == g.user.id,
        "body": c.body,
        "created_at": c.created_at.isoformat(),
        "time_ago": time_ago(c.created_at),
    }


def _note_dict(n, with_comments: bool = False) -> dict:
    d = {
        "id": n.id,
        "author": _user_dict(n.author),
        "is_mine": n.author_id == g.user.id,
        "title": n.title,
        "good": n.good or "",
        "bad": n.bad or "",
        "improve": n.improve or "",
        "note_date": n.note_date.isoformat() if n.note_date else None,
        "created_at": n.created_at.isoformat(),
        "time_ago": time_ago(n.created_at),
        "comment_count": len(n.comments),
    }
    if with_comments:
        d["comments"] = [_comment_dict(c) for c in n.comments]
    return d


def _require_couple():
    if not g.user.couple_id:
        return jsonify({"error": "couple_required"}), 403
    return None


def _get_note(note_id: int):
    n = db.session.get(CoupleNote, note_id)
    if n is None or n.couple_id != g.user.couple_id:
        return None
    return n


def _clean(s, limit: int) -> str:
    return (s or "").strip()[:limit]


def _parse_fields(data: dict):
    title = _clean(data.get("title"), TITLE_MAX)
    good = _clean(data.get("good"), BODY_MAX)
    bad = _clean(data.get("bad"), BODY_MAX)
    improve = _clean(data.get("improve"), BODY_MAX)
    if not title:
        return None, (jsonify({"error": "title_required"}), 400)
    if not (good or bad or improve):
        return None, (jsonify({"error": "body_required"}), 400)
    note_date = None
    raw = (data.get("note_date") or "").strip()
    if raw:
        try:
            note_date = datetime.strptime(raw, "%Y-%m-%d").date()
        except ValueError:
            return None, (jsonify({"error": "invalid_note_date"}), 400)
    return {"title": title, "good": good, "bad": bad, "improve": improve, "note_date": note_date}, None


@bp.get("/couple/notes")
@login_required
def list_notes():
    err = _require_couple()
    if err:
        return err
    limit = min(int(request.args.get("limit", 50)), 100)
    rows = db.session.scalars(
        select(CoupleNote)
        .where(CoupleNote.couple_id == g.user.couple_id)
        .order_by(CoupleNote.created_at.desc())
        .limit(limit)
    ).all()
    partner = _partner(g.user)
    return jsonify({
        "items": [_note_dict(n) for n in rows],
        "partner": _user_dict(partner) if partner else None,
    })


@bp.post("/couple/notes")
@login_required
def create_note():
    err = _require_couple()
    if err:
        return err
    fields, err = _parse_fields(request.get_json(silent=True) or {})
    if err:
        return err
    if fields["note_date"] is None:
        fields["note_date"] = kst_today()
    n = CoupleNote(couple_id=g.user.couple_id, author_id=g.user.id, **fields)
    db.session.add(n)
    db.session.commit()

    partner = _partner(g.user)
    if partner and partner.push_token:
        send_push(
            [partner.push_token],
            "속마음이야기",
            f"{g.user.nickname}님이 새 속마음을 남겼어요: {n.title[:20]}",
            {"type": "couple_note", "note_id": n.id},
        )
    return jsonify(_note_dict(n, with_comments=True)), 201


@bp.get("/couple/notes/<int:note_id>")
@login_required
def get_note(note_id):
    err = _require_couple()
    if err:
        return err
    n = _get_note(note_id)
    if n is None:
        return jsonify({"error": "not_found"}), 404
    return jsonify(_note_dict(n, with_comments=True))


@bp.put("/couple/notes/<int:note_id>")
@login_required
def update_note(note_id):
    err = _require_couple()
    if err:
        return err
    n = _get_note(note_id)
    if n is None:
        return jsonify({"error": "not_found"}), 404
    if n.author_id != g.user.id:
        return jsonify({"error": "forbidden"}), 403
    fields, err = _parse_fields(request.get_json(silent=True) or {})
    if err:
        return err
    for k, v in fields.items():
        if k == "note_date" and v is None:
            continue
        setattr(n, k, v)
    db.session.commit()
    return jsonify(_note_dict(n, with_comments=True))


@bp.delete("/couple/notes/<int:note_id>")
@login_required
def delete_note(note_id):
    err = _require_couple()
    if err:
        return err
    n = _get_note(note_id)
    if n is None:
        return jsonify({"error": "not_found"}), 404
    if n.author_id != g.user.id:
        return jsonify({"error": "forbidden"}), 403
    db.session.delete(n)
    db.session.commit()
    return jsonify({"ok": True})


@bp.post("/couple/notes/<int:note_id>/comments")
@login_required
def add_comment(note_id):
    err = _require_couple()
    if err:
        return err
    n = _get_note(note_id)
    if n is None:
        return jsonify({"error": "not_found"}), 404
    body = _clean((request.get_json(silent=True) or {}).get("body"), 500)
    if not body:
        return jsonify({"error": "body_required"}), 400
    c = CoupleNoteComment(note_id=n.id, author_id=g.user.id, body=body)
    db.session.add(c)
    db.session.commit()

    if n.author_id != g.user.id and n.author.push_token:
        send_push(
            [n.author.push_token],
            "속마음이야기",
            f"{g.user.nickname}님이 답글을 남겼어요: {body[:20]}",
            {"type": "couple_note", "note_id": n.id},
        )
    return jsonify(_comment_dict(c)), 201
