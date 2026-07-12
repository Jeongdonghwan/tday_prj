"""issues + issue_votes + issue_comments (DESIGN_UPDATE §5)

Revision ID: a3b4issues
Revises: a2b3dailypoll
Create Date: 2026-07-12
"""
import sqlalchemy as sa
from alembic import op

revision = "a3b4issues"
down_revision = "a2b3dailypoll"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "issues",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("title", sa.String(length=120), nullable=False),
        sa.Column("summary", sa.String(length=200), nullable=False),
        sa.Column("source", sa.String(length=30), nullable=True),
        sa.Column("url", sa.String(length=300), nullable=True),
        sa.Column("poll_option_a", sa.String(length=30), nullable=False),
        sa.Column("poll_option_b", sa.String(length=30), nullable=False),
        sa.Column("starts_at", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("comment_count", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_issue_active", "issues", ["is_active", "created_at"])
    op.create_table(
        "issue_votes",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("issue_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("side", sa.Enum("a", "b", name="issue_side"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["issue_id"], ["issues.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("issue_id", "user_id", name="uq_issue_vote"),
    )
    op.create_table(
        "issue_comments",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("issue_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("parent_id", sa.BigInteger(), nullable=True),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("like_count", sa.Integer(), nullable=False),
        sa.Column("author_status", sa.Enum("couple", "single", "married", name="author_status_issue"), nullable=False),
        sa.Column("is_blinded", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["issue_id"], ["issues.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.ForeignKeyConstraint(["parent_id"], ["issue_comments.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_issue_comment", "issue_comments", ["issue_id", "created_at"])


def downgrade():
    op.drop_index("idx_issue_comment", table_name="issue_comments")
    op.drop_table("issue_comments")
    op.drop_table("issue_votes")
    op.drop_index("idx_issue_active", table_name="issues")
    op.drop_table("issues")
