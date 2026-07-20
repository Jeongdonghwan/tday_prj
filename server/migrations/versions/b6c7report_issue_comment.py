"""reports.target_type enum 에 issue_comment 추가 — 이슈 댓글 신고 지원

Revision ID: b6c7report
Revises: b5c6cmtlike
Create Date: 2026-07-18
"""
import sqlalchemy as sa
from alembic import op

revision = "b6c7report"
down_revision = "b5c6cmtlike"
branch_labels = None
depends_on = None

OLD = ("post", "comment", "user")
NEW = ("post", "comment", "issue_comment", "user")


def upgrade():
    op.alter_column(
        "reports", "target_type",
        existing_type=sa.Enum(*OLD, name="report_target"),
        type_=sa.Enum(*NEW, name="report_target"), existing_nullable=False,
    )


def downgrade():
    op.alter_column(
        "reports", "target_type",
        existing_type=sa.Enum(*NEW, name="report_target"),
        type_=sa.Enum(*OLD, name="report_target"), existing_nullable=False,
    )
