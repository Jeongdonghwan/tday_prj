"""웹 SEO — 글 상세 서버렌더 공개 페이지 + 사이트맵/robots (검색엔진 개별 색인).

  GET /p/<id>        공개 글 페이지 (제목/본문/작성자 + OG 메타)
  GET /sitemap.xml   비블라인드 글 목록
  GET /robots.txt
앱은 SPA라 개별 색인이 안 되므로, 크롤러·공유용 서버렌더 페이지를 별도로 제공.
"""
from flask import Blueprint, Response, abort, current_app, render_template
from sqlalchemy import select

from .extensions import db
from .models import Post
from .models.enums import CATEGORY_LABELS

bp = Blueprint("seo", __name__)


@bp.get("/p/<int:post_id>")
def public_post(post_id: int):
    post = db.session.get(Post, post_id)
    if not post or post.is_blinded:
        abort(404)
    base = current_app.config["WEB_BASE_URL"].rstrip("/")
    return render_template(
        "post_public.html",
        post=post,
        category_label=CATEGORY_LABELS.get(post.category, ""),
        canonical=f"{base}/p/{post.id}",
    )


@bp.get("/sitemap.xml")
def sitemap():
    from .models import Test

    base = current_app.config["WEB_BASE_URL"].rstrip("/")
    posts = db.session.scalars(
        select(Post).where(Post.is_blinded.is_(False)).order_by(Post.id.desc()).limit(2000)
    ).all()
    tests = db.session.scalars(select(Test).where(Test.is_active.is_(True))).all()
    urls = (
        [f"{base}/t"]
        + [f"{base}/t/{t.slug}" for t in tests]  # 테스트 인트로 — 검색 유입 핵심 페이지
        + [f"{base}/terms", f"{base}/privacy"]
        + [f"{base}/p/{p.id}" for p in posts]
    )
    return Response(render_template("sitemap.xml", urls=urls), mimetype="application/xml")


@bp.get("/robots.txt")
def robots():
    base = current_app.config["WEB_BASE_URL"].rstrip("/")
    txt = f"User-agent: *\nAllow: /\nSitemap: {base}/sitemap.xml\n"
    return Response(txt, mimetype="text/plain")
