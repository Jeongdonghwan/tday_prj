"""Gunicorn / flask run 진입점.

운영(스펙 §8): gunicorn -w 2 -k gthread --threads 4 -b 127.0.0.1:8000 wsgi:app
  - 2GB RAM → 워커 2~3개로 제한 (과다 워커 금지).
로컬:  flask --app wsgi run  또는  flask --app wsgi init-db
"""
from app import create_app

app = create_app()
