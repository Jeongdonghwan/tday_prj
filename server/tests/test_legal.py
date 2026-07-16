"""약관·개인정보처리방침 공개 페이지 (스토어 심사·카카오 간편가입용 URL)."""


def test_terms_page(client):
    r = client.get("/terms")
    assert r.status_code == 200
    assert "이용약관" in r.get_data(as_text=True)


def test_privacy_page(client):
    r = client.get("/privacy")
    assert r.status_code == 200
    body = r.get_data(as_text=True)
    assert "개인정보처리방침" in body
    assert "회원 탈퇴" in body  # 계정 삭제 경로 안내 (심사 요건)


def test_pages_cross_link(client):
    assert '/privacy' in client.get("/terms").get_data(as_text=True)
    assert '/terms' in client.get("/privacy").get_data(as_text=True)
