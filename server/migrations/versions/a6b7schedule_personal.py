"""schedules 개인 일정 지원 (user_id 추가, couple_id nullable)

Revision ID: a6b7schedule
Revises: a5b6like
Create Date: 2026-07-13
"""
import sqlalchemy as sa
from alembic import op

revision = "a6b7schedule"
down_revision = "a5b6like"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("schedules", sa.Column("user_id", sa.BigInteger(), nullable=True))
    op.create_foreign_key("fk_schedule_user", "schedules", "users", ["user_id"], ["id"])
    op.alter_column("schedules", "couple_id", existing_type=sa.BigInteger(), nullable=True)
    op.create_index("idx_user_date", "schedules", ["user_id", "event_date"])


def downgrade():
    op.drop_index("idx_user_date", table_name="schedules")
    op.alter_column("schedules", "couple_id", existing_type=sa.BigInteger(), nullable=False)
    op.drop_constraint("fk_schedule_user", "schedules", type_="foreignkey")
    op.drop_column("schedules", "user_id")
