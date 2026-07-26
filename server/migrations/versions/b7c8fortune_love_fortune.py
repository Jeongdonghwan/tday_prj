"""연애운세 4테이블 — fortune_profiles / daily_fortunes / fortune_reads / compatibility_logs

Revision ID: b7c8fortune
Revises: b6c7report
Create Date: 2026-07-23
"""
import sqlalchemy as sa
from alembic import op

revision = "b7c8fortune"
down_revision = "b6c7report"
branch_labels = None
depends_on = None

LOVE = ("solo", "some", "couple", "rebound")


def upgrade():
    op.create_table(
        "fortune_profiles",
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("birth_date", sa.Date(), nullable=False),
        sa.Column("birth_time", sa.SmallInteger(), nullable=True),
        sa.Column("gender", sa.Enum("F", "M", name="fortune_gender"), nullable=False),
        sa.Column("love_status", sa.Enum(*LOVE, name="fortune_love_status"), nullable=False),
        sa.Column("zodiac", sa.SmallInteger(), nullable=False),
        sa.Column("push_enabled", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("push_time", sa.Enum("00", "07", "09", name="fortune_push_time"), nullable=False, server_default="00"),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "daily_fortunes",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("fortune_date", sa.Date(), nullable=False),
        sa.Column("zodiac", sa.SmallInteger(), nullable=False),
        sa.Column("love_status", sa.Enum(*LOVE, name="fortune_seg_love_status"), nullable=False),
        sa.Column("summary", sa.String(120), nullable=False),
        sa.Column("full_text", sa.Text(), nullable=False),
        sa.Column("cat_labels", sa.JSON(), nullable=False),
        sa.Column("published_at", sa.DateTime(), nullable=False),
        sa.Column("is_fallback", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.UniqueConstraint("fortune_date", "zodiac", "love_status", name="uq_fortune_seg"),
    )
    op.create_table(
        "fortune_reads",
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), primary_key=True),
        sa.Column("fortune_date", sa.Date(), primary_key=True),
        sa.Column("opened_at", sa.DateTime(), nullable=False),
    )
    op.create_table(
        "compatibility_logs",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("user_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("partner_birth", sa.Date(), nullable=False),
        sa.Column("score", sa.SmallInteger(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Index("idx_comp_user", "user_id", "created_at"),
    )


def downgrade():
    op.drop_table("compatibility_logs")
    op.drop_table("fortune_reads")
    op.drop_table("daily_fortunes")
    op.drop_table("fortune_profiles")
