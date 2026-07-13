"""업로드 + 인증·사진 게시판."""
import io


def test_upload_and_photo_post(client, token, bearer, app, tmp_path):
    app.config["UPLOAD_DIR"] = str(tmp_path)
    data = {"file": (io.BytesIO(b"\x89PNG\r\n\x1a\n fake"), "x.png")}
    r = client.post("/uploads", data=data, headers=bearer(token), content_type="multipart/form-data")
    assert r.status_code == 201
    url = r.get_json()["url"]
    assert "/uploads/" in url

    p = client.post("/posts", json={"category": "photo", "title": "내 인증", "image_url": url}, headers=bearer(token))
    assert p.status_code == 201
    pid = p.get_json()["id"]
    d = client.get(f"/posts/{pid}", headers=bearer(token)).get_json()
    assert d["image_url"] == url and d["category"] == "photo"


def test_photo_excluded_from_text_feed(client, token, bearer):
    client.post("/posts", json={"category": "free", "title": "텍스트글"}, headers=bearer(token))
    client.post("/posts", json={"category": "photo", "title": "사진글", "image_url": "http://x/y.png"}, headers=bearer(token))
    feed = client.get("/posts", headers=bearer(token)).get_json()["items"]
    assert "photo" not in [p["category"] for p in feed]
    photos = client.get("/posts?category=photo", headers=bearer(token)).get_json()["items"]
    assert len(photos) >= 1 and all(p["category"] == "photo" for p in photos)


def test_photo_requires_image(client, token, bearer):
    r = client.post("/posts", json={"category": "photo", "title": "no image"}, headers=bearer(token))
    assert r.status_code == 400


def test_new_categories_accepted(client, token, bearer):
    for cat in ("dating", "daily"):
        r = client.post("/posts", json={"category": cat, "title": f"{cat} 글"}, headers=bearer(token))
        assert r.status_code == 201


def test_upload_requires_auth(client):
    assert client.post("/uploads").status_code == 401


def test_upload_rejects_non_image(client, token, bearer, app, tmp_path):
    app.config["UPLOAD_DIR"] = str(tmp_path)
    data = {"file": (io.BytesIO(b"hello"), "x.txt")}
    r = client.post("/uploads", data=data, headers=bearer(token), content_type="multipart/form-data")
    assert r.status_code == 400
