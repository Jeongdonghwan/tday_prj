"""속마음이야기 — couple_notes / couple_note_comments

Revision ID: d2e3couplenote
Revises: c1d2global
"""
import sqlalchemy as sa
from alembic import op

revision = "d2e3couplenote"
down_revision = "c1d2global"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "couple_notes",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("couple_id", sa.BigInteger(), sa.ForeignKey("couples.id"), nullable=False),
        sa.Column("author_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(80), nullable=False),
        sa.Column("good", sa.Text(), nullable=True),
        sa.Column("bad", sa.Text(), nullable=True),
        sa.Column("improve", sa.Text(), nullable=True),
        sa.Column("note_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("idx_couple_note", "couple_notes", ["couple_id", "created_at"])
    op.create_table(
        "couple_note_comments",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("note_id", sa.BigInteger(), sa.ForeignKey("couple_notes.id"), nullable=False),
        sa.Column("author_id", sa.BigInteger(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        mysql_charset="utf8mb4",
        mysql_collate="utf8mb4_unicode_ci",
    )
    op.create_index("idx_couple_note_comment", "couple_note_comments", ["note_id", "created_at"])


def downgrade():
    op.drop_table("couple_note_comments")
    op.drop_index("idx_couple_note", table_name="couple_notes")
    op.drop_table("couple_notes")
