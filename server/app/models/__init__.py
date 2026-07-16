"""스펙 §6 DB 스키마의 단일 출처(SQLAlchemy 모델).

Alembic 마이그레이션과 `flask init-db`(create_all) 가 모두 이 모델들을 참조한다.
"""
from .user import User
from .couple import Couple
from .post import Comment, CommentLike, PollOption, Post, PostLike, Vote
from .daily import DailyAnswer, DailyQuestion
from .daily_poll import DailyPoll, DailyPollVote
from .issue import Issue, IssueComment, IssueVote
from .psych import Test, TestAttempt, TestQuestion, TestResult
from .schedule import Schedule
from .moderation import Block, Report
from .ad import AdSlot

__all__ = [
    "User",
    "Couple",
    "Post",
    "PollOption",
    "Vote",
    "PostLike",
    "Comment",
    "CommentLike",
    "DailyQuestion",
    "DailyAnswer",
    "DailyPoll",
    "DailyPollVote",
    "Issue",
    "IssueVote",
    "IssueComment",
    "Test",
    "TestQuestion",
    "TestResult",
    "TestAttempt",
    "Schedule",
    "Report",
    "Block",
    "AdSlot",
]
