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
    CORS(app)  # 앱(Expo) 에서 호출 — 초기엔 전체 허용, 운영에서 도메인 제한

    # 모델 import (마이그레이션/create_all 이 인식하도록)
    from . import models  # noqa: F401

    register_blueprints(app)

    @app.get("/health")
    def health():
        return jsonify({"status": "ok"}), 200

    _register_cli(app)
    return app


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
