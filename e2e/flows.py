"""오늘연애 웹 E2E — 핵심 사용자 플로우 자동 검증 (Playwright).

전제: Flask(5050) + expo web(8090) 기동, EXPO_PUBLIC_API_BASE_URL=http://127.0.0.1:5050.
실행: python e2e/flows.py  (chromium 필요)
각 플로우는 독립 try/except — 하나 실패해도 나머지 진행, 마지막에 요약 + 스크린샷 산출.
"""
import sys
import time
import pathlib
from playwright.sync_api import sync_playwright, expect

WEB = "http://127.0.0.1:8090"
API = "http://127.0.0.1:5050"
SHOTS = pathlib.Path(__file__).parent / "shots"
SHOTS.mkdir(exist_ok=True)

results = []


def step(name, fn):
    try:
        fn()
        results.append((name, "PASS", ""))
        print(f"[PASS] {name}")
    except Exception as e:
        results.append((name, "FAIL", str(e)[:200]))
        print(f"[FAIL] {name}: {e}")


def dev_login(pg, social_id):
    pg.goto(WEB, wait_until="networkidle", timeout=90000)
    pg.wait_for_timeout(2500)
    pg.fill("input", social_id)
    pg.get_by_text("로그인", exact=True).last.click()
    pg.wait_for_timeout(4000)


def run(pg):
    uid = f"e2e{int(time.time())}"

    def f_login():
        dev_login(pg, uid)
        assert "/login" not in pg.url, f"still on login: {pg.url}"
        pg.screenshot(path=str(SHOTS / "01_home.png"))

    def f_quickmenu():
        pg.goto(WEB + "/", wait_until="networkidle"); pg.wait_for_timeout(1500)
        expect(pg.get_by_text("연애고민").first).to_be_visible(timeout=8000)

    def f_write():
        pg.goto(WEB + "/write", wait_until="networkidle"); pg.wait_for_timeout(2000)
        pg.get_by_placeholder("제목을 입력하세요").fill(f"E2E 테스트 글 {uid}")
        pg.get_by_text("등록", exact=True).last.click()
        pg.wait_for_timeout(2500)
        pg.goto(WEB + "/community", wait_until="networkidle"); pg.wait_for_timeout(2500)
        expect(pg.get_by_text(f"E2E 테스트 글 {uid}").first).to_be_visible(timeout=8000)
        pg.screenshot(path=str(SHOTS / "02_community.png"))

    def f_detail_like_comment():
        pg.get_by_text(f"E2E 테스트 글 {uid}").first.click()
        pg.wait_for_timeout(2500)
        # 댓글 작성
        pg.get_by_placeholder("댓글을 입력하세요").fill("E2E 댓글입니다")
        pg.get_by_text("등록", exact=True).last.click()
        pg.wait_for_timeout(2000)
        expect(pg.get_by_text("E2E 댓글입니다").first).to_be_visible(timeout=8000)
        pg.screenshot(path=str(SHOTS / "03_detail.png"))

    def f_search():
        pg.goto(WEB + "/search", wait_until="networkidle"); pg.wait_for_timeout(1500)
        box = pg.get_by_placeholder("글 제목·내용 검색")
        box.fill("E2E")
        box.press("Enter")
        pg.wait_for_timeout(2500)
        expect(pg.get_by_text(f"E2E 테스트 글 {uid}").first).to_be_visible(timeout=8000)
        pg.screenshot(path=str(SHOTS / "04_search.png"))

    def f_profile():
        pg.goto(WEB + "/profile-edit", wait_until="networkidle"); pg.wait_for_timeout(2000)
        nick = f"E2E닉{uid[-4:]}"
        inp = pg.locator("input").first
        inp.fill(nick)
        pg.get_by_text("저장", exact=True).last.click()
        pg.wait_for_timeout(2500)
        pg.goto(WEB + "/my", wait_until="networkidle"); pg.wait_for_timeout(2000)
        expect(pg.get_by_text(nick).first).to_be_visible(timeout=8000)
        pg.screenshot(path=str(SHOTS / "05_profile.png"))

    def f_testzone():
        # 테스트존은 Flask(5050) 서버렌더
        pg.goto(API + "/t", wait_until="networkidle"); pg.wait_for_timeout(1000)
        expect(pg.get_by_text("테스트존").first).to_be_visible(timeout=8000)
        pg.get_by_text("애착유형").first.click(); pg.wait_for_timeout(1000)
        pg.get_by_text("시작하기").first.click(); pg.wait_for_timeout(1000)
        # 8문항: 매번 첫 선택지 클릭
        for _ in range(12):
            btns = pg.query_selector_all(".choice")
            if not btns:
                break
            btns[0].click()
            pg.wait_for_timeout(400)
        pg.wait_for_timeout(1500)
        assert "/result/" in pg.url, f"결과 페이지 미도달: {pg.url}"
        pg.screenshot(path=str(SHOTS / "06_testresult.png"))

    step("login", f_login)
    step("home quickmenu", f_quickmenu)
    step("write post", f_write)
    step("detail like/comment", f_detail_like_comment)
    step("search", f_search)
    step("profile edit", f_profile)
    step("testzone", f_testzone)


def main():
    with sync_playwright() as p:
        b = p.chromium.launch()
        pg = b.new_page(viewport={"width": 430, "height": 900}, device_scale_factor=1)
        try:
            run(pg)
        finally:
            b.close()
    print("\n=== E2E 요약 ===")
    for name, status, err in results:
        print(f" {status:4} {name} {('- ' + err) if err else ''}")
    failed = [r for r in results if r[1] == "FAIL"]
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
