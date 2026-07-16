"""users.is_deleted 추가 — 회원 탈퇴(소프트 삭제, 개인정보 익명화)

Revision ID: b2c3delete
Revises: b1c2story
Create Date: 2026-07-15
"""
import sqlalchemy as sa
from alembic import op

revision = "b2c3delete"
down_revision = "b1c2story"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column(
        "users",
        sa.Column("is_deleted", sa.Boolean(), nullable=False, server_default=sa.false()),
    )


def downgrade():
    op.drop_column("users", "is_deleted")
