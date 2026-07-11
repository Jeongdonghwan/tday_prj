"""add users.avatar_no + backfill (DESIGN_UPDATE §1)

Revision ID: a1b2avatar01
Revises: bff5ab3a2afb
Create Date: 2026-07-11
"""
import sqlalchemy as sa
from alembic import op

revision = "a1b2avatar01"
down_revision = "bff5ab3a2afb"
branch_labels = None
depends_on = None


def upgrade():
    with op.batch_alter_table("users") as batch:
        batch.add_column(sa.Column("avatar_no", sa.SmallInteger(), nullable=True))
    # 기존 유저 백필: avatar_no = (id mod 12) + 1  (MOD 로 % paramstyle 회피)
    op.execute("UPDATE users SET avatar_no = MOD(id, 12) + 1 WHERE avatar_no IS NULL")


def downgrade():
    with op.batch_alter_table("users") as batch:
        batch.drop_column("avatar_no")
