"""K-Story 파이프라인 서비스 (글로벌 확장 Phase 2).

한국 인기글(ko) → 후보 선정 → Claude 번역·각색 → (관리자 검수) → 영어 피드 발행.
임계치/모델/페이스는 전부 config(env). Claude 는 services/ai.py 패턴(선택 import) 재사용.
"""
import json
import re
from datetime import datetime, timedelta

from flask import current_app
from sqlalchemy import select

from ..extensions import db
from ..models import KStoryCandidate, Post, Report, User

# --- 운영 계정 (발행 author) ---
KSTORY_SOCIAL_ID = "system:kstory"
KSTORY_NICKNAME = "K-Story"


def get_or_create_operator() -> User:
    """K-Story 발행용 운영 계정(없으면 생성)."""
    u = db.session.scalar(
        select(User).where(User.social_provider == "dev", User.social_id == KSTORY_SOCIAL_ID)
    )
    if u is None:
        u = User(
            nickname=KSTORY_NICKNAME,
            social_provider="dev",
            social_id=KSTORY_SOCIAL_ID,
            relationship_status="single",
            is_deleted=False,
            lang="en",  # 영어 피드 게시자
        )
        db.session.add(u)
        db.session.commit()
    return u


# --- 1) 후보 선정 ---
def select_candidates(now: datetime | None = None) -> int:
    """임계치·동의 게이트를 만족하는 ko 인기글을 candidate 로 등록. 등록 수 반환."""
    cfg = current_app.config
    now = now or datetime.utcnow()
    since = now - timedelta(hours=cfg["KSTORY_WINDOW_H"])
    min_likes = cfg["KSTORY_MIN_LIKES"]
    min_comments = cfg["KSTORY_MIN_COMMENTS"]

    already = select(KStoryCandidate.source_post_id)
    reported = select(Report.target_id).where(Report.target_type == "post")

    rows = db.session.scalars(
        select(Post)
        .join(User, User.id == Post.user_id)
        .where(
            Post.lang == "ko",
            Post.post_type == "user",
            Post.is_blinded.is_(False),
            Post.created_at >= since,
            ((Post.like_count >= min_likes) | (Post.comment_count >= min_comments)),
            Post.id.not_in(already),
            Post.id.not_in(reported),
            User.terms_v2_agreed_at.isnot(None),  # 동의자 글만 (사용자 확정)
        )
    ).all()

    made = 0
    for p in rows:
        db.session.add(KStoryCandidate(source_post_id=p.id, status="candidate"))
        made += 1
    db.session.commit()
    return made


# --- 2) 번역·각색 (Claude) ---
_PROMPT = """You are localizing a popular Korean dating-community post for an English-speaking audience (Reddit r/relationship_advice vibe).

Rules:
- ANONYMIZE: remove or generalize any identifying details (real names, specific companies, schools, neighborhoods). Use "my partner", "a coworker", "this guy/girl", generic places.
- ADAPT, don't translate literally. Rewrite as a natural first-person English post that flows like a real person wrote it.
- CULTURE: briefly gloss Korea-specific concepts inline when needed (e.g., "sogaeting (a set-up blind date)", "some (the talking-stage before dating)", "my in-laws"). Keep the K-drama emotional texture.
- Keep it the same length ballpark as the original. No preamble.

Return ONLY one JSON object: {{"title": "...", "body": "...", "note": "..."}}
- title: catchy English title (<= 100 chars)
- body: the rewritten post
- note: 1-2 sentences for the human reviewer on what you changed/adapted and any sensitivity to check.

Korean title: {title}
Korean body: {body}"""


class KStoryTranslateError(Exception):
    pass


def _parse(text: str) -> dict:
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if not match:
        raise KStoryTranslateError("응답에서 JSON 을 찾지 못함")
    data = json.loads(match.group(0))
    if not data.get("title") or not data.get("body"):
        raise KStoryTranslateError("title/body 누락")
    return {
        "title": str(data["title"])[:120],
        "body": str(data["body"]),
        "note": str(data.get("note", ""))[:1000],
    }


def translate_post(title: str, body: str) -> dict:
    """Claude 로 익명화+각색 번역. {title, body, note} 반환. 키/의존성 없으면 예외."""
    key = current_app.config.get("ANTHROPIC_API_KEY")
    if not key:
        raise KStoryTranslateError("ANTHROPIC_API_KEY 미설정")
    try:
        from anthropic import Anthropic
    except ImportError:
        raise KStoryTranslateError("anthropic 미설치")

    client = Anthropic(api_key=key)
    resp = client.messages.create(
        model=current_app.config["KSTORY_MODEL"],
        max_tokens=1500,
        messages=[{"role": "user", "content": _PROMPT.format(title=title, body=body or "(none)")}],
    )
    return _parse(resp.content[0].text)


def translate_pending(limit: int = 20) -> dict:
    """candidate 상태 후보를 번역 → translated. {ok, failed} 반환. 실패는 텔레그램 알림."""
    from ..alerts import send_alert

    cands = db.session.scalars(
        select(KStoryCandidate).where(KStoryCandidate.status == "candidate").limit(limit)
    ).all()
    ok = 0
    failed = 0
    for c in cands:
        post = db.session.get(Post, c.source_post_id)
        if post is None:
            c.status = "rejected"  # 원본 사라짐
            continue
        try:
            out = translate_post(post.title, post.body or "")
        except KStoryTranslateError as e:
            failed += 1
            send_alert(f"[K-Story] 번역 실패 post_id={c.source_post_id}: {e}")
            continue
        c.translated_title = out["title"]
        c.translated_body = out["body"]
        c.translator_note = out["note"]
        c.status = "translated"
        ok += 1
    db.session.commit()
    return {"ok": ok, "failed": failed}


# --- 4) 발행 ---
def publish_approved(cap: int | None = None) -> int:
    """approved 후보를 en 피드에 발행(하루 cap 상한). 발행 수 반환."""
    from ..alerts import send_alert

    cap = cap if cap is not None else current_app.config["KSTORY_DAILY_CAP"]
    op = get_or_create_operator()
    cands = db.session.scalars(
        select(KStoryCandidate)
        .where(KStoryCandidate.status == "approved")
        .order_by(KStoryCandidate.updated_at.asc())
        .limit(cap)
    ).all()

    published = 0
    for c in cands:
        try:
            post = Post(
                user_id=op.id,
                category="story",
                title=(c.translated_title or "")[:120],
                body=c.translated_body,
                author_status=op.relationship_status,
                lang="en",
                post_type="kstory",
                source_post_id=c.source_post_id,
            )
            db.session.add(post)
            db.session.flush()
            c.published_post_id = post.id
            c.status = "published"
            published += 1
        except Exception as e:  # noqa: BLE001 — 발행 실패는 알림 후 계속
            db.session.rollback()
            send_alert(f"[K-Story] 발행 실패 candidate={c.id}: {e}")
    db.session.commit()
    return published


# --- 5) 원본 삭제 동기화 ---
def unpublish_for_source(source_post_id: int) -> int:
    """원본 글 삭제 시 연결된 kstory 발행글을 비공개(blind). 처리 수 반환."""
    rows = db.session.scalars(
        select(Post).where(Post.post_type == "kstory", Post.source_post_id == source_post_id)
    ).all()
    n = 0
    for p in rows:
        if not p.is_blinded:
            p.is_blinded = True
            n += 1
    if n:
        db.session.commit()
    return n


def sync_deleted() -> int:
    """원본이 사라진 kstory 발행글을 일괄 비공개(안전망 배치). 처리 수 반환."""
    live_post_ids = select(Post.id)
    orphans = db.session.scalars(
        select(Post).where(
            Post.post_type == "kstory",
            Post.is_blinded.is_(False),
            Post.source_post_id.isnot(None),
            Post.source_post_id.not_in(live_post_ids),
        )
    ).all()
    for p in orphans:
        p.is_blinded = True
    if orphans:
        db.session.commit()
    return len(orphans)
