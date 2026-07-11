"""환경별 설정. 스펙 §8(카페24 2GB) 고려해 커넥션 풀을 보수적으로 잡는다."""
import os

from dotenv import load_dotenv

load_dotenv()


def _bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).lower() in ("1", "true", "yes", "on")


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "change-me")

    SQLALCHEMY_DATABASE_URI = os.getenv(
        "DATABASE_URL",
        "mysql+pymysql://sseuljeon:sseuljeon@127.0.0.1:3307/sseuljeon",
    )
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    # 2GB 서버 — 풀 작게. 워커(2~3) x pool_size 가 DB max_connections 안에 들도록.
    SQLALCHEMY_ENGINE_OPTIONS = {
        "pool_size": 5,
        "max_overflow": 5,
        "pool_recycle": 280,      # MariaDB wait_timeout 보다 짧게 (끊긴 커넥션 방지)
        "pool_pre_ping": True,
    }

    # 자체 JWT
    JWT_SECRET = os.getenv("JWT_SECRET", "dev-jwt-secret")
    JWT_EXPIRES_DAYS = int(os.getenv("JWT_EXPIRES_DAYS", "30"))

    # 개발용 모의 로그인 (운영에서는 false)
    DEV_LOGIN_ENABLED = _bool("DEV_LOGIN_ENABLED", False)

    # 소셜 키 (없으면 해당 provider 비활성)
    KAKAO_REST_API_KEY = os.getenv("KAKAO_REST_API_KEY", "")
    APPLE_CLIENT_ID = os.getenv("APPLE_CLIENT_ID", "")
    APPLE_TEAM_ID = os.getenv("APPLE_TEAM_ID", "")
    APPLE_KEY_ID = os.getenv("APPLE_KEY_ID", "")

    # AI 선택지 제안 (스펙 §7 /ai/poll-suggest). 키 없으면 비활성(503).
    ANTHROPIC_API_KEY = os.getenv("ANTHROPIC_API_KEY", "")
    AI_MODEL = os.getenv("AI_MODEL", "claude-haiku-4-5")


class DevelopmentConfig(Config):
    DEBUG = True


class ProductionConfig(Config):
    DEBUG = False
    DEV_LOGIN_ENABLED = False  # 운영은 모의 로그인 강제 차단


class TestConfig(Config):
    TESTING = True
    DEBUG = True
    DEV_LOGIN_ENABLED = True
    JWT_SECRET = "test-secret"
    SQLALCHEMY_DATABASE_URI = os.getenv(
        "TEST_DATABASE_URL",
        "mysql+pymysql://sseuljeon:sseuljeon@127.0.0.1:3307/sseuljeon_test",
    )
    # 테스트는 트랜잭션 롤백으로 격리 → 풀 단순화
    SQLALCHEMY_ENGINE_OPTIONS = {"pool_pre_ping": True}


def get_config():
    env = os.getenv("FLASK_ENV", "development").lower()
    if env == "testing":
        return TestConfig
    return ProductionConfig if env == "production" else DevelopmentConfig
