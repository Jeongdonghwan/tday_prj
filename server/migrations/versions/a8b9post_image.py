"""posts.image_url (인증·사진 게시판)

Revision ID: a8b9image
Revises: a7b8categories
Create Date: 2026-07-13
"""
import sqlalchemy as sa
from alembic import op

revision = "a8b9image"
down_revision = "a7b8categories"
branch_labels = None
depends_on = None


def upgrade():
    op.add_column("posts", sa.Column("image_url", sa.String(length=300), nullable=True))


def downgrade():
    op.drop_column("posts", "image_url")
