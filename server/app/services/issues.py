"""이슈 등록 서비스 — 새 이슈 활성화 시 이전 이슈 자동 비활성 (DESIGN_UPDATE §5)."""
from datetime import datetime

from ..extensions import db
from ..models import Issue


def create_issue(
    title: str,
    summary: str,
    poll_option_a: str,
    poll_option_b: str,
    source: str | None = None,
    url: str | None = None,
) -> Issue:
    # 하루 1건: 기존 활성 이슈 전부 비활성화
    Issue.query.filter_by(is_active=True).update({"is_active": False})
    issue = Issue(
        title=title,
        summary=summary,
        source=source,
        url=url,
        poll_option_a=poll_option_a,
        poll_option_b=poll_option_b,
        starts_at=datetime.utcnow(),
        is_active=True,
    )
    db.session.add(issue)
    db.session.commit()
    return issue
