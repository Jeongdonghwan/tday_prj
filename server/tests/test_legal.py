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


def test_root_landing(client):
    """도메인 루트 — 404 아님 (검색엔진 수집·인증용)."""
    r = client.get("/")
    assert r.status_code == 200
    assert "오늘연애" in r.get_data(as_text=True)


def test_child_safety_page(client):
    """아동 안전 표준 — 구글 플레이 정책 요건: 오류 없이 로드 + CSAE 언급 + 앱/개발자명 언급."""
    r = client.get("/child-safety")
    assert r.status_code == 200
    body = r.get_data(as_text=True)
    assert "CSAE" in body and "CSAM" in body  # 관련성 요건
    assert "오늘연애" in body and "TodayLoves" in body  # 스토어 앱명
    assert "에이치코" in body  # 개발자명
    assert "jdhwan0227@gmail.com" in body  # 담당 연락처
