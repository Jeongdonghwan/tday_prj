"""post_likes (공감 토글 — 유저당 1회)

Revision ID: a5b6like
Revises: a4b5psych
Create Date: 2026-07-13
"""
import sqlalchemy as sa
from alembic import op

revision = "a5b6like"
down_revision = "a4b5psych"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "post_likes",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("post_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["post_id"], ["posts.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("post_id", "user_id", name="uq_post_like"),
    )


def downgrade():
    op.drop_table("post_likes")
