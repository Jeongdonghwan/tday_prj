"""데일리 스레드 자동 글 (FORTUNE_UPDATE.md §8) — 운영 계정으로 커뮤니티에 매일 1건.

00:00 잡에서 일상잡담(daily) 보드에 `[M월 D일] 오늘 연애운, 실제로 맞았어요? 🌙` 글 생성.
오늘연애 탭 배너가 이 글 id 로 링크. 생성 실패/미존재 시 배너 미노출(빈 상태).
운영 계정: social_provider="dev", social_id="system:official" (idempotent 시드).
"""
from datetime import date

from sqlalchemy import select

from ..extensions import db
from ..models import Post, User

OPERATOR_SOCIAL_ID = "system:official"
OPERATOR_NICKNAME = "오늘연애"

_THREAD_BODY = (
    "오늘 자정에 공개된 연애운, 다들 확인하셨나요? 🌙\n\n"
    "• 오늘 내 연애운 점수는 몇 점이었나요?\n"
    "• 운세대로 흘러간 하루였는지, 아니면 완전 반대였는지\n"
    "• 타로 카드나 궁합 결과 중 인상 깊었던 것\n\n"
    "실제로 맞았던(혹은 빗나간) 썰을 댓글로 나눠주세요. 내일 자정, 또 새로운 운세가 찾아옵니다!"
)


def get_or_create_operator() -> User:
    """운영 계정 조회(없으면 생성). 데일리 스레드 author."""
    u = db.session.scalar(
        select(User).where(User.social_provider == "dev", User.social_id == OPERATOR_SOCIAL_ID)
    )
    if u is None:
        u = User(
            nickname=OPERATOR_NICKNAME,
            social_provider="dev",
            social_id=OPERATOR_SOCIAL_ID,
            relationship_status="single",
            is_deleted=False,
        )
        db.session.add(u)
        db.session.commit()
    return u


def _thread_title(d: date) -> str:
    return f"[{d.month}월 {d.day}일] 오늘 연애운, 실제로 맞았어요? 🌙"


def daily_thread_id(d: date):
    """해당 날짜의 데일리 스레드 글 id (없으면 None). 배너 링크용."""
    title = _thread_title(d)
    op = db.session.scalar(
        select(User).where(User.social_provider == "dev", User.social_id == OPERATOR_SOCIAL_ID)
    )
    if op is None:
        return None
    return db.session.scalar(
        select(Post.id).where(Post.user_id == op.id, Post.title == title)
    )


def create_daily_thread(d: date) -> int:
    """데일리 스레드 글 생성(idempotent). 이미 있으면 기존 id 반환."""
    existing = daily_thread_id(d)
    if existing is not None:
        return existing
    op = get_or_create_operator()
    post = Post(
        user_id=op.id,
        category="daily",
        title=_thread_title(d),
        body=_THREAD_BODY,
        author_status=op.relationship_status,
    )
    db.session.add(post)
    db.session.commit()
    return post.id
