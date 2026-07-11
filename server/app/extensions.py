"""Flask 확장 인스턴스 (앱 팩토리에서 init_app)."""
from flask_migrate import Migrate
from flask_sqlalchemy import SQLAlchemy

db = SQLAlchemy()
migrate = Migrate()
