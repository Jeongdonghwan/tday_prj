"""앱 팩토리. create_app() 으로 Flask 인스턴스 구성."""
import click
from flask import Flask, jsonify
from flask_cors import CORS

from config import get_config

from .api import register_blueprints
from .extensions import db, migrate


def create_app(config_object=None) -> Flask:
    app = Flask(__name__)
    app.config.from_object(config_object or get_config())

    # 확장 초기화
    db.init_app(app)
    migrate.init_app(app, db)
    # CORS — 운영은 CORS_ORIGINS(콤마 목록)로 앱/웹 도메인만 허용
    _origins = app.config.get("CORS_ORIGINS", "*")
    origins = "*" if _origins.strip() == "*" else [o.strip() for o in _origins.split(",") if o.strip()]
    CORS(app, origins=origins)

    _prod_safety_check(app)

    # 모델 import (마이그레이션/create_all 이 인식하도록)
    from . import models  # noqa: F401

    register_blueprints(app)

    # 웹(심리테스트존) + 관리자 (DESIGN_UPDATE §5·§6) + SEO 공개 글페이지 — Jinja
    from .admin import bp as admin_bp
    from .seo import bp as seo_bp
    from .web import bp as web_bp

    app.register_blueprint(web_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(seo_bp)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    _register_cli(app)
    return app


def _prod_safety_check(app):
    """운영(DEBUG=False)에서 기본 시크릿/개발 로그인이 켜져 있으면 경고(치명 설정은 예외)."""
    if app.debug or app.config.get("TESTING"):
        return
    problems = []
    if app.config.get("JWT_SECRET") in (None, "", "dev-jwt-secret"):
        problems.append("JWT_SECRET 이 기본값입니다 — 강력한 값으로 설정하세요.")
    if app.config.get("SECRET_KEY") in (None, "", "change-me"):
        problems.append("SECRET_KEY 가 기본값입니다.")
    if app.config.get("ADMIN_TOKEN") in (None, "", "dev-admin-token"):
        problems.append("ADMIN_TOKEN 이 기본값입니다 — 관리자 페이지가 노출됩니다.")
    if app.config.get("DEV_LOGIN_ENABLED"):
        problems.append("DEV_LOGIN_ENABLED 가 켜져 있습니다 — 운영에서는 끄세요(키 없이 로그인 가능).")
    if app.config.get("CORS_ORIGINS", "*").strip() == "*":
        problems.append("CORS_ORIGINS 가 전체 허용(*)입니다 — 도메인을 제한하세요.")
    for p in problems:
        app.logger.warning("[보안 경고] %s", p)


def _parse_date_opt(date_str):
    """--date YYYY-MM-DD 파싱 (없으면 None)."""
    if not date_str:
        return None
    from datetime import datetime as _dt

    return _dt.strptime(date_str, "%Y-%m-%d").date()


def _register_cli(app: Flask):
    @app.cli.command("init-db")
    def init_db():
        """모델 기준으로 전 테이블 생성 (마이그레이션 없이 빠른 부트스트랩)."""
        db.create_all()
        click.echo("DB 테이블 생성 완료 (create_all).")

    @app.cli.command("recompute-hot")
    def recompute_hot():
        """전체 글 hot_score 재계산 (운영: cron 5분 주기)."""
        from .ranking import recompute_hot_scores

        n = recompute_hot_scores()
        click.echo(f"hot_score 갱신 완료: {n}건")

    @app.cli.command("notify-daily")
    def notify_daily():
        """오늘의 질문 도착 푸시 (운영: 매일 cron)."""
        from sqlalchemy import select

        from .models import User
        from .push import send_push

        tokens = db.session.scalars(select(User.push_token).where(User.push_token.isnot(None))).all()
        sent = send_push(list(tokens), "오늘의 질문", "오늘 질문이 도착했어요. 지금 답해보세요!", {"type": "daily_arrived"})
        click.echo(f"오늘의질문 푸시 발송: {sent}건")

    @app.cli.command("notify-best")
    def notify_best():
        """베스트 등재 글 작성자에게 푸시 (운영: hot_score 배치 후)."""
        from sqlalchemy import select

        from .models import Post, User
        from .push import send_push

        top = db.session.scalars(
            select(Post).where(Post.is_blinded.is_(False)).order_by(Post.hot_score.desc()).limit(3)
        ).all()
        sent = 0
        for p in top:
            author = db.session.get(User, p.user_id)
            if author and author.push_token:
                sent += send_push([author.push_token], "베스트 등재", f"'{p.title[:20]}' 글이 BEST에 올랐어요!", {"type": "best", "post_id": p.id})
        click.echo(f"베스트 푸시 발송: {sent}건")

    @app.cli.command("seed-poll")
    def seed_poll():
        """활성 커뮤니티 데일리 폴이 없으면 데모 1건 삽입 (idempotent, DESIGN_UPDATE §3)."""
        from datetime import date

        from .models import DailyPoll

        if DailyPoll.query.filter_by(is_active=True).count() > 0:
            click.echo("이미 활성 데일리 폴이 있어 건너뜁니다.")
            return
        db.session.add(
            DailyPoll(
                question="축의금, 10만원이 적당할까 부담일까?",
                choice_a="10만원 적당",
                choice_b="5만원도 충분",
                scheduled_date=date.today(),
                is_active=True,
            )
        )
        db.session.commit()
        click.echo("데모 데일리 폴 삽입 완료.")

    @app.cli.command("seed-test")
    @click.argument("md_path")
    def seed_test_cmd(md_path):
        """심리테스트 MD 파일을 파싱해 DB 등록 (DESIGN_UPDATE §6). 예: flask seed-test ../sulzun_design_update/tests/test01_love_type.md"""
        from pathlib import Path

        from .services.psych import seed_test

        text = Path(md_path).read_text(encoding="utf-8")
        t = seed_test(text)
        click.echo(f"테스트 등록 완료: {t.slug}" if t else "이미 등록된 slug 라 건너뜀.")

    @app.cli.command("seed-love-tests")
    def seed_love_tests():
        """연애 심리테스트 10종 시드 (idempotent, slug 중복 건너뜀)."""
        from .seeds.love_tests import TESTS
        from .services.psych import create_test_from_data

        n = 0
        for data in TESTS:
            if create_test_from_data(data, update=True):
                n += 1
        click.echo(f"연애 테스트 시드/갱신 완료: {n}개 (전체 {len(TESTS)}종).")

    @app.cli.command("seed-content")
    @click.option("--reset/--no-reset", default=True, help="기존 글/댓글/투표 삭제 후 재구성")
    def seed_content_cmd(reset):
        """실서비스 톤 커뮤니티 콘텐츠 시드 (글 35+·댓글·투표·오늘의질문 2주)."""
        from .seeds.content import seed_content

        r = seed_content(reset=reset)
        click.echo(f"콘텐츠 시드 완료: 글 {r['posts']} / 댓글 {r['comments']} / 오늘의질문 {r['daily_questions']}")

    @app.cli.command("fortune-generate")
    @click.option("--date", "date_str", default=None, help="YYYY-MM-DD (기본: 내일 KST)")
    @click.option("--lang", type=click.Choice(["ko", "en"]), default="ko")
    @click.option("--overwrite/--no-overwrite", default=False)
    @click.option("--ai/--no-ai", "ai_flag", default=None, help="AI 생성 강제/비활성 (기본: 키 있으면 AI)")
    def fortune_generate(date_str, lang, overwrite, ai_flag):
        """연애운세 48세그먼트 생성 (크론 23:40). 기본은 내일 날짜(KST)·ko."""
        from datetime import timedelta

        from .fortune.generate import LAST_RUN, generate_for_date
        from .fortune.kst import kst_today

        d = _parse_date_opt(date_str) or (kst_today() + timedelta(days=1))
        n = generate_for_date(d, lang=lang, overwrite=overwrite, ai=ai_flag)
        click.echo(f"운세 생성({lang}): {d} → {n}세그먼트 (AI {LAST_RUN['ai']} / 폴백 {LAST_RUN['fallback']})")
        for err in LAST_RUN["errors"]:
            click.echo(f"  ! AI 실패 → 폴백: {err}")

    @app.cli.command("fortune-verify")
    @click.option("--date", "date_str", default=None, help="YYYY-MM-DD (기본: 내일 KST)")
    @click.option("--lang", type=click.Choice(["ko", "en"]), default="ko")
    def fortune_verify(date_str, lang):
        """해당 언어권 48행 미만이면 폴백으로 채움 (크론 23:55)."""
        from datetime import timedelta

        from .fortune.generate import verify_for_date
        from .fortune.kst import kst_today

        d = _parse_date_opt(date_str) or (kst_today() + timedelta(days=1))
        n = verify_for_date(d, lang=lang)
        click.echo(f"운세 검증({lang}): {d} → 부족분 {n}건 보충")

    @app.cli.command("fortune-notify")
    @click.option("--cohort", type=click.Choice(["00", "07", "09"]), required=True)
    @click.option("--date", "date_str", default=None, help="YYYY-MM-DD (기본: 오늘 KST)")
    def fortune_notify(cohort, date_str):
        """코호트별 연애운세 푸시 발송 (크론 00:00/07:00/09:00). 기본은 오늘 날짜(KST)."""
        from .fortune.kst import kst_today
        from .fortune.notify import notify_cohort

        d = _parse_date_opt(date_str) or kst_today()
        r = notify_cohort(cohort, d)
        click.echo(f"운세 푸시({r['cohort']}시): {r['date']} 대상 {r['targets']} / 발송 {r['sent']} / 스킵 {r['skipped']}")

    @app.cli.command("seed-operator")
    def seed_operator():
        """데일리 스레드 운영 계정(오늘연애) 시드 (idempotent)."""
        from .fortune.thread import get_or_create_operator

        u = get_or_create_operator()
        click.echo(f"운영 계정: id={u.id} nickname={u.nickname}")

    @app.cli.command("fortune-thread")
    @click.option("--date", "date_str", default=None, help="YYYY-MM-DD (기본: 오늘 KST)")
    def fortune_thread(date_str):
        """데일리 스레드 자동 글 생성 (크론 00:00, idempotent)."""
        from .fortune.kst import kst_today
        from .fortune.thread import create_daily_thread

        d = _parse_date_opt(date_str) or kst_today()
        pid = create_daily_thread(d)
        click.echo(f"데일리 스레드: {d} → post_id={pid}")

    # --- K-Story 파이프라인 (글로벌 확장 Phase 2) ---
    @app.cli.command("seed-kstory-operator")
    def seed_kstory_operator():
        """K-Story 발행 운영 계정(K-Story) 시드 (idempotent)."""
        from .services.kstory import get_or_create_operator

        u = get_or_create_operator()
        click.echo(f"K-Story 운영 계정: id={u.id} nickname={u.nickname}")

    @app.cli.command("kstory-select")
    def kstory_select():
        """인기 ko 글을 K-Story 후보로 선정 (크론 일 1회)."""
        from .services.kstory import select_candidates

        n = select_candidates()
        click.echo(f"K-Story 후보 선정: {n}건")

    @app.cli.command("kstory-translate")
    @click.option("--limit", default=20, type=int)
    def kstory_translate(limit):
        """candidate 후보를 Claude 로 번역·각색 → translated (크론 수 회/일)."""
        from .services.kstory import translate_pending

        r = translate_pending(limit=limit)
        click.echo(f"K-Story 번역: 성공 {r['ok']} / 실패 {r['failed']}")

    @app.cli.command("kstory-publish")
    def kstory_publish():
        """approved 후보를 영어 피드에 발행 (크론 일 1~3, cap=KSTORY_DAILY_CAP)."""
        from .services.kstory import publish_approved

        n = publish_approved()
        click.echo(f"K-Story 발행: {n}건")

    @app.cli.command("kstory-sync")
    def kstory_sync():
        """원본 사라진 K-Story 발행글 비공개 정리 (안전망 배치)."""
        from .services.kstory import sync_deleted

        n = sync_deleted()
        click.echo(f"K-Story 동기화(비공개): {n}건")

    @app.cli.command("seed-issue")
    def seed_issue():
        """활성 이슈가 없으면 데모 1건 삽입 (idempotent, DESIGN_UPDATE §5)."""
        from .models import Issue
        from .services.issues import create_issue

        if Issue.query.filter_by(is_active=True).count() > 0:
            click.echo("이미 활성 이슈가 있어 건너뜁니다.")
            return
        create_issue(
            title="MZ세대 결혼 비용 인식 조사 결과 발표",
            summary="설문 응답자 절반이 '스몰웨딩 선호'. 예식 비용 평균은 여전히 상승세.",
            source="통계뉴스",
            url="https://example.com/wedding-survey",
            poll_option_a="스몰웨딩",
            poll_option_b="제대로 한번",
        )
        click.echo("데모 이슈 삽입 완료.")

    @app.cli.command("seed")
    def seed():
        """샘플 글/투표/댓글/오늘의질문 삽입 (피드가 비어보이지 않게)."""
        from datetime import date, datetime, timedelta

        from .models import Comment, DailyQuestion, PollOption, Post, User

        def get_or_create_user(nickname, status):
            u = User.query.filter_by(nickname=nickname).first()
            if not u:
                u = User(
                    nickname=nickname,
                    social_provider="dev",
                    social_id=f"seed:{nickname}",
                    relationship_status=status,
                )
                db.session.add(u)
                db.session.flush()
            return u

        if Post.query.count() > 0:
            click.echo("이미 글이 있어 seed 를 건너뜁니다.")
            return

        sokssang = get_or_create_user("속상러", "couple")
        myeoneuri = get_or_create_user("현명한며느리", "married")
        saechulbal = get_or_create_user("새출발", "single")
        hyeonsil = get_or_create_user("현실연애", "married")
        jungrip = get_or_create_user("중립기어", "couple")

        now = datetime.utcnow()

        p1 = Post(user_id=sokssang.id, category="love", title="기념일 까먹은 남친, 이거 헤어질 일임?",
                  body="사귄 지 1년 됐는데 100일도 그냥 넘어갔고 이번엔 제 생일까지 까먹었어요. 미안하다는 말도 제가 서운하다고 한참 말하고 나서야 했고요.",
                  is_poll=True, author_status="couple", view_count=1834, like_count=643,
                  comment_count=2, created_at=now - timedelta(hours=2))
        p2 = Post(user_id=myeoneuri.id, category="marriage", title="명절에 시댁만 3일, 친정은 안 가도 되는 건가요",
                  body="결혼 2년 차예요. 매번 명절마다 시댁에서 3일을 꽉 채우고 친정은 잠깐 들르는 게 당연한 분위기라…",
                  is_poll=True, author_status="married", view_count=4120, like_count=1100,
                  comment_count=0, created_at=now - timedelta(hours=5))
        p3 = Post(user_id=saechulbal.id, category="counsel", title="전 애인이 6개월 만에 연락 왔어요",
                  body="갑자기 잘 지내냐고 연락이 왔는데 받아야 할지 모르겠어요…",
                  is_poll=False, author_status="single", view_count=980, like_count=421,
                  comment_count=0, created_at=now - timedelta(hours=6))
        db.session.add_all([p1, p2, p3])
        db.session.flush()

        db.session.add_all([
            PollOption(post_id=p1.id, side="A", label="여친이 서운한 게 당연", vote_count=746),
            PollOption(post_id=p1.id, side="B", label="너무 예민한 듯", vote_count=458),
            PollOption(post_id=p2.id, side="A", label="이건 아니지", vote_count=2306),
            PollOption(post_id=p2.id, side="B", label="어쩔 수 없어", vote_count=541),
        ])
        db.session.add_all([
            Comment(post_id=p1.id, user_id=hyeonsil.id, body="1년 동안 기념일 다 까먹는 건 무딘 게 아니라 관심이 없는 거예요.",
                    like_count=214, author_status="married", created_at=now - timedelta(hours=1)),
            Comment(post_id=p1.id, user_id=jungrip.id, body="근데 헤어질 일까진 아닌 듯. 대화로 풀 수 있는 부분 같은데요.",
                    like_count=56, author_status="couple", created_at=now - timedelta(minutes=48)),
        ])

        today = date.today()
        for i, q in enumerate([
            "싸우고 나면 누가 먼저 연락하는 게 맞을까?",
            "데이트 비용은 어떻게 나누는 게 맞을까?",
            "연락 텀, 하루 몇 번이 적당할까?",
        ]):
            db.session.add(DailyQuestion(question=q, scheduled_date=today - timedelta(days=i)))

        db.session.commit()

        from .ranking import recompute_hot_scores

        recompute_hot_scores()
        click.echo("seed 완료: 글 3 / 투표 2 / 댓글 2 / 오늘의질문 3 (hot_score 계산됨)")
