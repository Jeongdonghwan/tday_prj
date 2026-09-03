"""웹 빌드(dist) HTML 전체에 SEO/OG 메타 주입 — expo export 후 실행."""
import glob, os, re, sys

DIST = os.path.join(os.path.dirname(__file__), "..", "dist")
TITLE = "오늘연애 — 매일 자정 연애운세·연애 커뮤니티"
DESC = "매일 자정, 생년월일과 연애 상태에 맞춘 나만의 연애운세. 익명 연애 고민 커뮤니티와 밸런스 투표, 커플 속마음이야기까지."
URL = "https://todayloves.com"
IMG = "https://todayloves.com/static/og.png"
META = (
    f'<meta name="description" content="{DESC}"/>'
    f'<meta property="og:type" content="website"/>'
    f'<meta property="og:site_name" content="오늘연애"/>'
    f'<meta property="og:title" content="{TITLE}"/>'
    f'<meta property="og:description" content="{DESC}"/>'
    f'<meta property="og:url" content="{URL}"/>'
    f'<meta property="og:image" content="{IMG}"/>'
    f'<meta property="og:image:width" content="1200"/>'
    f'<meta property="og:image:height" content="630"/>'
    f'<meta name="twitter:card" content="summary_large_image"/>'
    f'<meta name="twitter:title" content="{TITLE}"/>'
    f'<meta name="twitter:description" content="{DESC}"/>'
    f'<meta name="twitter:image" content="{IMG}"/>'
)

n = 0
for path in glob.glob(os.path.join(DIST, "**", "*.html"), recursive=True):
    h = open(path, encoding="utf-8").read()
    if 'property="og:image"' in h:
        continue
    # 빈 타이틀 채우기
    h = h.replace('<title data-rh="true"></title>', f'<title data-rh="true">{TITLE}</title>', 1)
    h = re.sub(r'(<meta charSet="utf-8"/>)', r"\1" + META, h, count=1)
    open(path, "w", encoding="utf-8").write(h)
    n += 1
print(f"meta injected: {n} html files")
