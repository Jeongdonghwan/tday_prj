"""posts.category 게시판 카테고리 확장 (+dating/daily/photo)

Revision ID: a7b8categories
Revises: a6b7schedule
Create Date: 2026-07-13
"""
import sqlalchemy as sa
from alembic import op

revision = "a7b8categories"
down_revision = "a6b7schedule"
branch_labels = None
depends_on = None

OLD = ("love", "marriage", "counsel", "free")
NEW = ("love", "dating", "marriage", "counsel", "daily", "free", "photo")


def upgrade():
    op.alter_column(
        "posts", "category",
        existing_type=sa.Enum(*OLD, name="post_category"),
        type_=sa.Enum(*NEW, name="post_category"),
        existing_nullable=False,
    )


def downgrade():
    op.alter_column(
        "posts", "category",
        existing_type=sa.Enum(*NEW, name="post_category"),
        type_=sa.Enum(*OLD, name="post_category"),
        existing_nullable=False,
    )
