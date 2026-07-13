"""웹 SEO — 공개 글 페이지 + 사이트맵 + robots."""


def _post(client, headers, title="검색 노출 글", body="본문 내용"):
    return client.post("/posts", json={"category": "free", "title": title, "body": body}, headers=headers).get_json()["id"]


def test_public_post_renders_with_og(client, token, bearer):
    pid = _post(client, bearer(token))
    r = client.get(f"/p/{pid}")
    assert r.status_code == 200
    html = r.get_data(as_text=True)
    assert "검색 노출 글" in html
    assert 'property="og:title"' in html and 'rel="canonical"' in html


def test_public_post_404_when_missing(client):
    assert client.get("/p/99999").status_code == 404


def test_sitemap_lists_post(client, token, bearer):
    pid = _post(client, bearer(token))
    r = client.get("/sitemap.xml")
    assert r.status_code == 200 and "application/xml" in r.content_type
    assert f"/p/{pid}" in r.get_data(as_text=True)


def test_robots(client):
    r = client.get("/robots.txt")
    assert r.status_code == 200 and "Sitemap:" in r.get_data(as_text=True)
