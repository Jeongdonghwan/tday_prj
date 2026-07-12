"""tests + test_questions + test_results + test_attempts (DESIGN_UPDATE §6)

Revision ID: a4b5psych
Revises: a3b4issues
Create Date: 2026-07-12
"""
import sqlalchemy as sa
from alembic import op

revision = "a4b5psych"
down_revision = "a3b4issues"
branch_labels = None
depends_on = None


def upgrade():
    op.create_table(
        "tests",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("slug", sa.String(length=40), nullable=False),
        sa.Column("title", sa.String(length=80), nullable=False),
        sa.Column("intro", sa.String(length=200), nullable=True),
        sa.Column("cover_img", sa.String(length=200), nullable=True),
        sa.Column("tiebreak", sa.String(length=60), nullable=True),
        sa.Column("is_active", sa.Boolean(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("slug"),
    )
    op.create_table(
        "test_questions",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("test_id", sa.BigInteger(), nullable=False),
        sa.Column("sort_order", sa.Integer(), nullable=False),
        sa.Column("question", sa.String(length=200), nullable=False),
        sa.Column("choice1", sa.String(length=80), nullable=False),
        sa.Column("choice1_code", sa.String(length=10), nullable=False),
        sa.Column("choice2", sa.String(length=80), nullable=False),
        sa.Column("choice2_code", sa.String(length=10), nullable=False),
        sa.Column("choice3", sa.String(length=80), nullable=True),
        sa.Column("choice3_code", sa.String(length=10), nullable=True),
        sa.ForeignKeyConstraint(["test_id"], ["tests.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "test_results",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("test_id", sa.BigInteger(), nullable=False),
        sa.Column("code", sa.String(length=10), nullable=False),
        sa.Column("title", sa.String(length=60), nullable=False),
        sa.Column("catchphrase", sa.String(length=80), nullable=True),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("match_code", sa.String(length=10), nullable=True),
        sa.Column("clash_code", sa.String(length=10), nullable=True),
        sa.Column("avatar_no", sa.SmallInteger(), nullable=True),
        sa.ForeignKeyConstraint(["test_id"], ["tests.id"]),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_table(
        "test_attempts",
        sa.Column("id", sa.BigInteger(), autoincrement=True, nullable=False),
        sa.Column("test_id", sa.BigInteger(), nullable=False),
        sa.Column("anon_uuid", sa.CHAR(length=36), nullable=True),
        sa.Column("user_id", sa.BigInteger(), nullable=True),
        sa.Column("result_id", sa.BigInteger(), nullable=False),
        sa.Column("ref", sa.String(length=30), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(["test_id"], ["tests.id"]),
        sa.ForeignKeyConstraint(["result_id"], ["test_results.id"]),
        sa.PrimaryKeyConstraint("id"),
    )


def downgrade():
    op.drop_table("test_attempts")
    op.drop_table("test_results")
    op.drop_table("test_questions")
    op.drop_table("tests")
