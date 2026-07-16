"""users.email 추가 — 카카오/애플 계정 이메일 (동의 시, CS·계정 안내용)

Revision ID: b3c4email
Revises: b2c3delete
Create Date: 2026-07-16
"""
import sqlalchemy as sa
from alembic import op

revision = "b3c4email"
down_revision = "b2c3delete"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("users", sa.Column("email", sa.String(255), nullable=True))


def downgrade():
    op.drop_column("users", "email")
