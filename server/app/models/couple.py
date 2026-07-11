from datetime import datetime

from sqlalchemy import BigInteger, Date, DateTime, String

from ..extensions import db


class Couple(db.Model):
    __tablename__ = "couples"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    user_a = db.Column(BigInteger, db.ForeignKey("users.id"), nullable=False)
    user_b = db.Column(BigInteger, db.ForeignKey("users.id"), nullable=True)
    invite_code = db.Column(String(6), unique=True, nullable=False)
    start_date = db.Column(Date, nullable=True)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
