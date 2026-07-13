"""ad_slots (광고 슬롯)

Revision ID: a9c0ads
Revises: a8b9image
Create Date: 2026-07-13
"""
import sqlalchemy as sa
from alembic import op

revision = "a9c0ads"
down_revision = "a8b9image"
branch_labels = None
depends_on = None

POSITIONS = ("feed_native", "issue_bottom", "web_wing_l", "web_wing_r", "web_rail")


def upgrade():
    op.create_table(
        "ad_slots",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("position", sa.Enum(*POSITIONS, name="ad_position"), nullable=False),
        sa.Column("image", sa.String(length=300), nullable=False),
        sa.Column("link_url", sa.String(length=500), nullable=False),
        sa.Column("starts_at", sa.DateTime(), nullable=False),
        sa.Column("ends_at", sa.DateTime(), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("impressions", sa.Integer(), nullable=False),
        sa.Column("clicks", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("idx_ad_position_active", "ad_slots", ["position", "is_active"])


def downgrade():
    op.drop_index("idx_ad_position_active", table_name="ad_slots")
    op.drop_table("ad_slots")
