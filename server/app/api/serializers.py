"""API 응답 직렬화 + 표시용 헬퍼 (상태 라벨/상대시간은 서버에서 계산해 클라 단순화)."""
from datetime import datetime

from ..models.enums import CATEGORY_LABELS, STATUS_LABELS


def time_ago(dt: datetime) -> str:
    """작성시각 → '방금 전 / N분 전 / N시간 전 / N일 전 / MM월 DD일'."""
    if dt is None:
        return ""
    seconds = (datetime.utcnow() - dt).total_seconds()
    if seconds < 60:
        return "방금 전"
    minutes = seconds / 60
    if minutes < 60:
        return f"{int(minutes)}분 전"
    hours = minutes / 60
    if hours < 24:
        return f"{int(hours)}시간 전"
    days = hours / 24
    if days < 7:
        return f"{int(days)}일 전"
    return f"{dt.month}월 {dt.day}일"


def _author(entity) -> dict:
    """글/댓글 작성자 요약 + 작성 시점 상태 스냅샷."""
    author = getattr(entity, "author", None)
    return {
        "id": author.id if author else None,
        "nickname": author.nickname if author else "알 수 없음",
        "status": entity.author_status,
        "status_label": STATUS_LABELS.get(entity.author_status, ""),
        "avatar_no": author.avatar() if author else 1,  # DESIGN_UPDATE §1
    }


def post_dict(post, my_vote: str | None = None) -> dict:
    data = {
        "id": post.id,
        "category": post.category,
        "category_label": CATEGORY_LABELS.get(post.category, ""),
        "title": post.title,
        "body": post.body,
        "is_poll": post.is_poll,
        "author": _author(post),
        "time_text": time_ago(post.created_at),
        "created_at": post.created_at.isoformat() if post.created_at else None,
        "view_count": post.view_count,
        "like_count": post.like_count,
        "comment_count": post.comment_count,
    }
    if post.is_poll:
        opts = {o.side: o for o in post.options}
        a, b = opts.get("A"), opts.get("B")
        a_votes = a.vote_count if a else 0
        b_votes = b.vote_count if b else 0
        total = a_votes + b_votes
        data["poll"] = {
            "a_label": a.label if a else "",
            "b_label": b.label if b else "",
            "a_votes": a_votes,
            "b_votes": b_votes,
            "total": total,
            "a_pct": round(a_votes / total * 100) if total else 50,
            "my_vote": my_vote,  # 'A' | 'B' | None
        }
    return data


def comment_dict(comment, replies=None) -> dict:
    return {
        "id": comment.id,
        "parent_id": comment.parent_id,
        "body": comment.body,
        "like_count": comment.like_count,
        "author": _author(comment),
        "time_text": time_ago(comment.created_at),
        "created_at": comment.created_at.isoformat() if comment.created_at else None,
        "reply_count": len(replies) if replies else 0,
        "replies": [comment_dict(r) for r in (replies or [])],
    }
