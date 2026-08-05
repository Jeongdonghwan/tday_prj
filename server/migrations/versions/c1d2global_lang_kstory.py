"""글로벌 확장 — 언어권 분리(lang) + K-Story 파이프라인

users/posts/daily_polls/issues/daily_fortunes 에 lang 추가(기존 전부 'ko' 백필),
posts 에 post_type/source_post_id, users 에 terms_v2_agreed_at,
daily_fortunes 유니크(fortune_date,zodiac,love_status)→(+lang),
kstory_candidates 신규.

Revision ID: c1d2global
Revises: b7c8fortune
Create Date: 2026-08-05
"""
import sqlalchemy as sa
from alembic import op

revision = "c1d2global"
down_revision = "b7c8fortune"
branch_labels = None
depends_on = None


def upgrade():
    # --- users ---
    op.add_column("users", sa.Column("lang", sa.String(5), nullable=False, server_default="ko"))
    op.add_column("users", sa.Column("terms_v2_agreed_at", sa.DateTime(), nullable=True))

    # --- posts ---
    op.add_column("posts", sa.Column("lang", sa.String(5), nullable=False, server_default="ko"))
    op.add_column("posts", sa.Column("post_type", sa.String(20), nullable=False, server_default="user"))
    op.add_column("posts", sa.Column("source_post_id", sa.BigInteger(), nullable=True))
    op.create_index("idx_posts_lang_created", "posts", ["lang", "created_at"])

    # --- 피드/홈 노출 콘텐츠 테이블 ---
    op.add_column("daily_polls", sa.Column("lang", sa.String(5), nullable=False, server_default="ko"))
    op.add_column("issues", sa.Column("lang", sa.String(5), nullable=False, server_default="ko"))
    op.add_column("daily_fortunes", sa.Column("lang", sa.String(5), nullable=False, server_default="ko"))

    # daily_fortunes 유니크 제약에 lang 추가 (언어권별 세그먼트 공존)
    op.drop_constraint("uq_fortune_seg", "daily_fortunes", type_="unique")
    op.create_unique_constraint(
        "uq_fortune_seg", "daily_fortunes", ["fortune_date", "zodiac", "love_status", "lang"]
    )

    # --- kstory_candidates ---
    op.create_table(
        "kstory_candidates",
        sa.Column("id", sa.BigInteger(), primary_key=True, autoincrement=True),
        sa.Column("source_post_id", sa.BigInteger(), nullable=False),
        sa.Column("status", sa.String(20), nullable=False, server_default="candidate"),
        sa.Column("translated_title", sa.Text(), nullable=True),
        sa.Column("translated_body", sa.Text(), nullable=True),
        sa.Column("translator_note", sa.Text(), nullable=True),
        sa.Column("published_post_id", sa.BigInteger(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False),
        sa.Column("updated_at", sa.DateTime(), nullable=False),
        sa.UniqueConstraint("source_post_id", name="uq_kstory_source"),
    )


def downgrade():
    op.drop_table("kstory_candidates")

    op.drop_constraint("uq_fortune_seg", "daily_fortunes", type_="unique")
    op.create_unique_constraint(
        "uq_fortune_seg", "daily_fortunes", ["fortune_date", "zodiac", "love_status"]
    )
    op.drop_column("daily_fortunes", "lang")
    op.drop_column("issues", "lang")
    op.drop_column("daily_polls", "lang")

    op.drop_index("idx_posts_lang_created", table_name="posts")
    op.drop_column("posts", "source_post_id")
    op.drop_column("posts", "post_type")
    op.drop_column("posts", "lang")

    op.drop_column("users", "terms_v2_agreed_at")
    op.drop_column("users", "lang")
