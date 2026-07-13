"""posts.category 에 story(썰·후기) 추가

Revision ID: b1c2story
Revises: a9c0ads
Create Date: 2026-07-13
"""
import sqlalchemy as sa
from alembic import op

revision = "b1c2story"
down_revision = "a9c0ads"
branch_labels = None
depends_on = None

OLD = ("love", "dating", "marriage", "counsel", "daily", "free", "photo")
NEW = ("love", "dating", "marriage", "counsel", "daily", "story", "free", "photo")


def upgrade():
    op.alter_column("posts", "category",
        existing_type=sa.Enum(*OLD, name="post_category"),
        type_=sa.Enum(*NEW, name="post_category"), existing_nullable=False)


def downgrade():
    op.alter_column("posts", "category",
        existing_type=sa.Enum(*NEW, name="post_category"),
        type_=sa.Enum(*OLD, name="post_category"), existing_nullable=False)
