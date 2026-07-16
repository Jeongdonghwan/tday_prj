"""이메일 간편가입 — social_provider enum 에 'email' 추가 + users.password_hash

Revision ID: b4c5emailpw
Revises: b3c4email
Create Date: 2026-07-16
"""
import sqlalchemy as sa
from alembic import op

revision = "b4c5emailpw"
down_revision = "b3c4email"
branch_labels = None
depends_on = None

OLD = ("kakao", "apple", "dev")
NEW = ("kakao", "apple", "email", "dev")


def upgrade():
    op.alter_column(
        "users", "social_provider",
        existing_type=sa.Enum(*OLD, name="social_provider"),
        type_=sa.Enum(*NEW, name="social_provider"), existing_nullable=False,
    )
    op.add_column("users", sa.Column("password_hash", sa.String(255), nullable=True))


def downgrade():
    op.drop_column("users", "password_hash")
    op.alter_column(
        "users", "social_provider",
        existing_type=sa.Enum(*NEW, name="social_provider"),
        type_=sa.Enum(*OLD, name="social_provider"), existing_nullable=False,
    )
