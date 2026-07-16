"""comment_likes 추가 — 댓글 좋아요 유저당 1회 토글

Revision ID: b5c6cmtlike
Revises: b4c5emailpw
Create Date: 2026-07-17
"""
import sqlalchemy as sa
from alembic import op

revision = "b5c6cmtlike"
down_revision = "b4c5emailpw"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "comment_likes",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("comment_id", sa.BigInteger(), sa.ForeignKey("comments.id"), nullable=False),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("comment_id", "user_id", name="uq_comment_like"),
    )


def downgrade():
    op.drop_table("comment_likes")
