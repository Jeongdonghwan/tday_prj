"""이미지 업로드 (인증·사진). 로컬 디스크 저장 + 서빙.

  POST /uploads          multipart file=<image>  → { url }
  GET  /uploads/<name>   저장 이미지 서빙
"""
import os
import uuid

from flask import Blueprint, current_app, jsonify, request, send_from_directory

from ..auth import login_required

bp = Blueprint("uploads", __name__)

ALLOWED = {"jpg": "image/jpeg", "jpeg": "image/jpeg", "png": "image/png", "webp": "image/webp", "gif": "image/gif"}


def _upload_dir():
    d = current_app.config["UPLOAD_DIR"]
    os.makedirs(d, exist_ok=True)
    return d


@bp.post("/uploads")
@login_required
def upload():
    f = request.files.get("file")
    if not f or not f.filename:
        return jsonify({"error": "file_required"}), 400
    ext = f.filename.rsplit(".", 1)[-1].lower() if "." in f.filename else ""
    if ext not in ALLOWED:
        return jsonify({"error": "unsupported_type"}), 400

    # 용량 제한
    f.seek(0, os.SEEK_END)
    size = f.tell()
    f.seek(0)
    if size > current_app.config["UPLOAD_MAX_BYTES"]:
        return jsonify({"error": "too_large"}), 400

    name = f"{uuid.uuid4().hex}.{ext}"
    f.save(os.path.join(_upload_dir(), name))
    base = current_app.config["WEB_BASE_URL"].rstrip("/")
    return jsonify({"url": f"{base}/uploads/{name}"}), 201


@bp.get("/uploads/<path:name>")
def serve(name):
    return send_from_directory(_upload_dir(), name)
