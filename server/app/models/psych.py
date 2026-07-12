"""연애 심리테스트존 (DESIGN_UPDATE §6). 유형 집계형 채점."""
from datetime import datetime

from sqlalchemy import BigInteger, Boolean, CHAR, DateTime, ForeignKey, Integer, SmallInteger, String, Text

from ..extensions import db


class Test(db.Model):
    __tablename__ = "tests"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    slug = db.Column(String(40), unique=True, nullable=False)
    title = db.Column(String(80), nullable=False)
    intro = db.Column(String(200), nullable=True)
    cover_img = db.Column(String(200), nullable=True)
    tiebreak = db.Column(String(60), nullable=True)  # 동점 우선순위 "RB,DG,FX,CT,BR,PG"
    is_active = db.Column(Boolean, nullable=False, default=True)
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)

    questions = db.relationship("TestQuestion", backref="test", cascade="all, delete-orphan", order_by="TestQuestion.sort_order")
    results = db.relationship("TestResult", backref="test", cascade="all, delete-orphan")


class TestQuestion(db.Model):
    __tablename__ = "test_questions"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    test_id = db.Column(BigInteger, ForeignKey("tests.id"), nullable=False)
    sort_order = db.Column(Integer, nullable=False)
    question = db.Column(String(200), nullable=False)
    choice1 = db.Column(String(80), nullable=False)
    choice1_code = db.Column(String(10), nullable=False)
    choice2 = db.Column(String(80), nullable=False)
    choice2_code = db.Column(String(10), nullable=False)
    choice3 = db.Column(String(80), nullable=True)
    choice3_code = db.Column(String(10), nullable=True)


class TestResult(db.Model):
    __tablename__ = "test_results"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    test_id = db.Column(BigInteger, ForeignKey("tests.id"), nullable=False)
    code = db.Column(String(10), nullable=False)
    title = db.Column(String(60), nullable=False)
    catchphrase = db.Column(String(80), nullable=True)
    description = db.Column(Text, nullable=True)
    match_code = db.Column(String(10), nullable=True)
    clash_code = db.Column(String(10), nullable=True)
    avatar_no = db.Column(SmallInteger, nullable=True)


class TestAttempt(db.Model):
    __tablename__ = "test_attempts"

    id = db.Column(BigInteger, primary_key=True, autoincrement=True)
    test_id = db.Column(BigInteger, ForeignKey("tests.id"), nullable=False)
    anon_uuid = db.Column(CHAR(36), nullable=True)
    user_id = db.Column(BigInteger, nullable=True)  # 앱 로그인 유저(뱃지 연동), 폴리모픽 회피 위해 FK 미선언
    result_id = db.Column(BigInteger, ForeignKey("test_results.id"), nullable=False)
    ref = db.Column(String(30), nullable=True)  # 퍼널 유입 추적
    created_at = db.Column(DateTime, nullable=False, default=datetime.utcnow)
