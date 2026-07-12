"""모든 API Blueprint 등록 (스펙 §7)."""
from . import ai, auth, best, comments, couple, daily, daily_poll, issues, moderation, posts, schedules

# auth 관련은 prefix 없이 루트(/auth/social, /me), 나머지는 의미상 루트 경로 그대로.
_blueprints = [
    auth.bp,
    posts.bp,
    comments.bp,
    best.bp,
    daily.bp,
    daily_poll.bp,
    issues.bp,
    couple.bp,
    schedules.bp,
    moderation.bp,
    ai.bp,
]


def register_blueprints(app):
    for bp in _blueprints:
        app.register_blueprint(bp)
