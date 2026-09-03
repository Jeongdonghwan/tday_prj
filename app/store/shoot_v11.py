"""v1.1 마케팅용 스크린샷 — 심사계정 로그인 상태로 운세/홈/커뮤니티/속마음/테스트 캡처."""
import os, time, requests
from playwright.sync_api import sync_playwright

API = "https://api.todayloves.com"
BASE = "https://todayloves.com"
OUT = os.path.join(os.path.dirname(__file__), "screenshots_v11")
os.makedirs(OUT, exist_ok=True)
VIEWPORT = {"width": 360, "height": 640}  # 실기기 CSS 크기 — @3x 로 1080x1920 출력

def j(r):
    try: return r.json()
    except Exception: return {}

# 1) 심사계정 로그인 + 운세 프로필
rt = j(requests.post(API+"/auth/login", json={"email":"reviewer@todayloves.com","password":"Reviewg8FAmGxuW4Q"}))["token"]
rh = {"Authorization": f"Bearer {rt}"}
requests.post(API+"/fortune/profile", json={"birth_date":"1998-03-14","gender":"F","love_status":"some","push_enabled":False}, headers=rh)

# 2) 데모 파트너 + 커플 + 속마음 노트 (이미 돼 있으면 재사용)
pw = "DemoPartner1!"
pr = requests.post(API+"/auth/signup", json={"email":"demo.partner@todayloves.com","password":pw})
if pr.status_code == 409:
    pr = requests.post(API+"/auth/login", json={"email":"demo.partner@todayloves.com","password":pw})
pt = j(pr).get("token"); ph = {"Authorization": f"Bearer {pt}"} if pt else None
note_id = None
notes = j(requests.get(API+"/couple/notes", headers=rh))
if isinstance(notes, dict) and notes.get("items"):
    note_id = notes["items"][0]["id"]
else:
    inv = j(requests.post(API+"/couple/invite", headers=rh)).get("invite_code")
    if inv and ph:
        requests.post(API+"/couple/join", json={"code": inv}, headers=ph)
    made = j(requests.post(API+"/couple/notes", json={
        "title":"나트랑 여행 후기","good":"바다 보면서 아무 말 없이 걷던 순간이 제일 좋았어. 네가 챙겨준 선크림도!",
        "bad":"둘째 날 일정이 너무 빡빡해서 지쳤던 것 같아. 내가 예민하게 군 것도 미안해.",
        "improve":"다음 여행은 하루에 두 곳만 가고, 저녁엔 무조건 쉬기로 하자!"}, headers=rh))
    note_id = made.get("id")
    if note_id and ph:
        requests.post(API+f"/couple/notes/{note_id}/comments", json={"body":"나도 그 바다 산책이 제일 기억나 🥹 다음엔 진짜 느긋하게 가자"}, headers=ph)
print("note_id:", note_id)

# 3) 캡처
with sync_playwright() as p:
    browser = p.chromium.launch()
    ctx = browser.new_context(viewport=VIEWPORT, device_scale_factor=3, is_mobile=True, has_touch=True,
        user_agent="Mozilla/5.0 (Linux; Android 14; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120 Mobile Safari/537.36")
    ctx.add_init_script(f"try{{localStorage.setItem('sseuljeon.jwt','{rt}')}}catch(e){{}}")
    page = ctx.new_page()

    def shot(name, path, scroll=0, wait=3.5):
        page.goto(BASE+path, wait_until="networkidle")
        time.sleep(wait)
        if scroll:
            # RN-web ScrollView(내부 div) 스크롤 — window 스크롤이 아닌 스크롤 가능한 div 에 적용
            page.evaluate(f"""() => {{
                const els=[...document.querySelectorAll('div')].filter(e=>e.scrollHeight>e.clientHeight+80);
                els.forEach(e=>{{ e.scrollTop = {scroll}; }});
            }}""")
            time.sleep(1.2)
        page.screenshot(path=os.path.join(OUT, name+".png"))
        print("shot:", name)

    shot("01_fortune", "/fortune")
    shot("02_tarot", "/fortune", scroll=1150)
    shot("03_community", "/community")
    shot("04_home", "/")
    if note_id:
        shot("05_couple_note", f"/couple/notes/{note_id}")
    shot("06_tests", "/t")
    browser.close()
print("DONE")
