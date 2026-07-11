"""daily_polls + daily_poll_votes (DESIGN_UPDATE §3)

Revision ID: a2b3dailypoll
Revises: a1b2avatar01
Create Date: 2026-07-11
"""
import sqlalchemy as sa
from alembic import op

revision = "a2b3dailypoll"
down_revision = "a1b2avatar01"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "daily_polls",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("question", sa.Text(), nullable=False),
        sa.Column("choice_a", sa.String(length=40), nullable=False),
        sa.Column("choice_b", sa.String(length=40), nullable=False),
        sa.Column("choice_c", sa.String(length=40), nullable=True),
        sa.Column("scheduled_date", sa.Date(), nullable=False),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_poll_active", "daily_polls", ["is_active", "scheduled_date"])
    op.create_table(
        "daily_poll_votes",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("poll_id", sa.BigInteger(), nullable=False),
        sa.Column("user_id", sa.BigInteger(), nullable=False),
        sa.Column("side", sa.Enum("a", "b", "c", name="daily_poll_side"), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["poll_id"], ["daily_polls.id"]),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"]),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("poll_id", "user_id", name="uq_daily_poll_vote"),
    )


def downgrade():
    op.drop_table("daily_poll_votes")
    op.drop_index("idx_poll_active", table_name="daily_polls")
    op.drop_table("daily_polls")
