"""플레이스토어 휴대전화 스크린샷 캡처 — 운영 사이트(todayloves.com)를 폰 뷰포트로 촬영.
결과: app/store/screenshots/*.png (세로, 1080x1920 근처). 로그인 없이 게스트 화면 캡처."""
import os
import time

from playwright.sync_api import sync_playwright

BASE = "https://todayloves.com"
OUT = os.path.join(os.path.dirname(__file__), "screenshots")
os.makedirs(OUT, exist_ok=True)

# 플레이 권장: 각 면 최소 1080px. 1080x1920(9:16) 세로.
VIEWPORT = {"width": 1080, "height": 1920}
DSF = 1  # 이미 1080이라 배율 1

PAGES = [
    ("01_home", "/"),
    ("02_community", "/community"),
    ("03_issues", "/issues"),
    ("04_best", "/best"),
    ("05_tests", "/t"),
]


def run():
    with sync_playwright() as p:
        browser = p.chromium.launch()
        ctx = browser.new_context(
            viewport=VIEWPORT,
            device_scale_factor=DSF,
            is_mobile=True,
            has_touch=True,
            user_agent="Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 "
            "(KHTML, like Gecko) Chrome/120 Mobile Safari/537.36",
        )
        page = ctx.new_page()
        for name, path in PAGES:
            page.goto(BASE + path, wait_until="networkidle")
            time.sleep(2.5)  # 렌더/데이터 로드 여유
            # 콘텐츠 높이 측정 → 여백 최소화(단, 최소 1350px 유지해 세로 비율 확보)
            h = page.evaluate("() => document.body.scrollHeight")
            clip_h = max(1350, min(int(h) + 20, 3840))
            fn = os.path.join(OUT, f"{name}.png")
            page.screenshot(path=fn, clip={"x": 0, "y": 0, "width": 1080, "height": clip_h})
            print("saved", fn, clip_h)
        browser.close()


if __name__ == "__main__":
    run()
