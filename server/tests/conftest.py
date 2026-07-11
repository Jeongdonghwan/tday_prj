"""pytest 공용 fixture — Docker MariaDB 테스트DB(sseuljeon_test) 기준.

격리 전략: 세션 1회 create_all → 매 테스트 전 전 테이블 TRUNCATE + 캐시 클리어.
"""
import os

import pytest
from sqlalchemy import create_engine, text

os.environ.setdefault("FLASK_ENV", "testing")

from app import create_app  # noqa: E402
from app.extensions import db  # noqa: E402
from app.ranking import cache_clear  # noqa: E402
from config import TestConfig  # noqa: E402


def _ensure_database():
    """테스트DB 가 없으면 root 로 생성(로컬). CI 는 서비스 컨테이너가 미리 생성."""
    dbname = TestConfig.SQLALCHEMY_DATABASE_URI.rsplit("/", 1)[1].split("?")[0]
    root_url = os.getenv("TEST_DB_ROOT_URL", "mysql+pymysql://root:rootpw@127.0.0.1:3307/")
    try:
        eng = create_engine(root_url)
        with eng.connect() as c:
            c.execute(text(f"CREATE DATABASE IF NOT EXISTS {dbname} CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci"))
            c.execute(text(f"GRANT ALL ON {dbname}.* TO 'sseuljeon'@'%'"))
            c.commit()
        eng.dispose()
    except Exception:
        pass


@pytest.fixture(scope="session")
def app():
    _ensure_database()
    application = create_app(TestConfig)
    # 스키마만 만들고 app context 는 들고 있지 않는다.
    # (context 를 유지하면 test_client 요청들이 같은 scoped session 을 공유해
    #  이전 테스트의 stale 객체가 남아 flush 오류가 난다 — 요청마다 teardown 으로 세션이 정리되게 둔다.)
    with application.app_context():
        db.drop_all()
        db.create_all()
    yield application


@pytest.fixture(autouse=True)
def _clean(app):
    """매 테스트 전 깨끗한 상태로 리셋.

    DELETE(행 락만) 사용 — TRUNCATE 의 메타데이터 락이 idle-in-transaction
    커넥션에 막히는 문제를 피한다. ORM 세션은 먼저 remove() 로 해제.
    """
    with app.app_context():
        cache_clear()
        db.session.remove()
        with db.engine.begin() as conn:
            conn.execute(text("SET FOREIGN_KEY_CHECKS=0"))
            for table in reversed(db.metadata.sorted_tables):
                conn.execute(text(f"DELETE FROM `{table.name}`"))
            conn.execute(text("SET FOREIGN_KEY_CHECKS=1"))
    yield


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def register(client):
    """dev 로그인 → (token, user_id)."""

    def _register(social_id="tester1"):
        r = client.post("/auth/social", json={"provider": "dev", "social_id": social_id})
        d = r.get_json()
        return d["token"], d["user"]["id"]

    return _register


@pytest.fixture
def token(register):
    tok, _ = register("tester1")
    return tok


@pytest.fixture
def bearer():
    return lambda tok: {"Authorization": f"Bearer {tok}"}
