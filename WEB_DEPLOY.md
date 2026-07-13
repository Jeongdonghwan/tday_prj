# 오늘연애 — PC 웹(Expo Web) 배포 가이드

Expo Router 앱을 **정적 사이트(`output: "static"`)** 로 export 해서 기존 인프라에 얹는 방법.
데스크톱(≥1240px)은 상단 GNB + 3영역 레이아웃, 그 미만은 기존 모바일 레이아웃으로 자동 전환된다(반응형, 한 번의 빌드로 둘 다 커버).

---

## 1. 빌드(정적 export)

```bash
cd app
# API 호스트를 고정해서 빌드 (미지정 시 dev 폴백 IP 를 씀 → 운영 금지)
EXPO_PUBLIC_API_BASE_URL="https://api.todaylove.co.kr" \
EXPO_PUBLIC_WEB_BASE_URL="https://api.todaylove.co.kr" \
npx expo export --platform web --output-dir dist
```

- 산출물: `app/dist/` (`index.html`, `_expo/static/js/...`, 라우트별 정적 HTML, 에셋).
- `app.json` 에 이미 `web.output: "static"`, `web.favicon: ./assets/brand/app_icon.png` 설정됨.
- `EXPO_PUBLIC_*` 값은 **빌드 시점에 번들에 박힌다.** API 주소가 바뀌면 재빌드 필요.
- 테스트존(`/tests`)은 웹에서 `tests.web.tsx` 가 `<iframe src=${WEB_BASE_URL}/t>` 로 렌더 → `EXPO_PUBLIC_WEB_BASE_URL` 이 Flask(`/t`) 호스트를 가리켜야 함.

빌드 검증:
```bash
npx expo export --platform web --output-dir dist   # "Exported: dist" 나오면 성공
```

---

## 2. ⚠️ 경로 충돌 주의 (동일 오리진 배포의 핵심 함정)

앱의 클라이언트 라우트와 Flask API 경로가 **겹친다**:

| 클라이언트 라우트(브라우저 주소) | Flask 가 이미 점유 | 결과 |
|---|---|---|
| `/issues/5` (이슈 상세 딥링크) | `GET /issues/<int:id>` (API, JSON 반환) | 같은 오리진이면 HTML 대신 JSON → **깨짐** |
| `/post/12` (글 상세 딥링크) | `GET /posts/...` 는 다르지만 SPA fallback 필요 | catch-all 설계 필요 |
| `/t`, `/t/<slug>` (테스트존) | `GET /t...` (Jinja) | 웹앱이 먹으면 안 됨 → 프록시 유지 |
| `/home/*`, `/auth/*`, `/me/*`, `/comments/*` | API | 웹앱이 먹으면 안 됨 |

**결론: 웹앱은 별도 오리진(서브도메인)에 두는 것을 권장.** 그러면 경로 충돌이 원천 차단되고
SPA fallback(`try_files ... /index.html`)이 API 를 건드리지 않는다.

- 권장: `https://www.todaylove.co.kr` (웹앱, 정적) + `https://api.todaylove.co.kr` (기존 Flask).
- CORS: 서버 `create_app()` 에 `CORS(app)` 로 전체 허용 상태 → 운영에서는
  `CORS(app, origins=["https://www.todaylove.co.kr"])` 로 좁힐 것.

---

## 3. 방식 A — nginx 정적 서빙 (권장)

웹앱 전용 서브도메인. 정적 파일 + SPA fallback 만 담당하고, API/테스트존은 기존 Flask 로 프록시하지 않는다
(웹앱이 API 를 직접 절대 URL 로 호출하므로 프록시 불필요).

```nginx
# www.todaylove.co.kr  — 웹앱(정적)
server {
    listen 80;
    server_name www.todaylove.co.kr;
    root /var/www/todaylove-web/dist;   # expo export 산출물
    index index.html;

    # 정적 에셋은 장기 캐시
    location /_expo/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    # SPA fallback — 어떤 딥링크(/issues/5, /post/12)든 index.html
    location / {
        try_files $uri $uri.html $uri/ /index.html;
    }
}
```

```nginx
# api.todaylove.co.kr — 기존 Flask (gunicorn wsgi:app) 프록시. 이미 있으면 그대로.
server {
    listen 80;
    server_name api.todaylove.co.kr;
    location / {
        proxy_pass http://127.0.0.1:8000;   # gunicorn wsgi:app
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

배포 절차:
```bash
# 1) 빌드 (§1, API 주소 = api.todaylove.co.kr)
# 2) 서버로 업로드
rsync -a --delete app/dist/ deploy@server:/var/www/todaylove-web/dist/
# 3) nginx reload
ssh deploy@server 'sudo nginx -t && sudo systemctl reload nginx'
```

---

## 4. 방식 B — 기존 Flask 한 오리진에 얹기 (서브도메인을 못 쓸 때)

같은 오리진이면 §2 경로 충돌 때문에 **웹앱을 서브패스(`/app`)로 격리**해야 안전하다.

1) 서브패스 baseUrl 로 빌드 — `app.json`:
```json
"experiments": { "baseUrl": "/app" }
```
```bash
EXPO_PUBLIC_API_BASE_URL="https://todaylove.co.kr" \
EXPO_PUBLIC_WEB_BASE_URL="https://todaylove.co.kr" \
npx expo export --platform web --output-dir dist
```

2) Flask 에 정적 마운트 + SPA fallback (`/app/*` 만, API·`/t`·`/admin` 는 건드리지 않음):
```python
# app/web.py 또는 별도 spa.py
import os
from flask import Blueprint, send_from_directory

DIST = os.path.join(os.path.dirname(__file__), "..", "webdist")  # dist 업로드 위치
spa_bp = Blueprint("spa", __name__)

@spa_bp.get("/app", defaults={"path": ""})
@spa_bp.get("/app/<path:path>")
def spa(path):
    full = os.path.join(DIST, path)
    if path and os.path.isfile(full):
        return send_from_directory(DIST, path)          # 정적 에셋
    return send_from_directory(DIST, "index.html")       # 그 외 → SPA fallback
```
`create_app()` 에서 `app.register_blueprint(spa_bp)` 등록. 접속: `https://todaylove.co.kr/app`.

> 서브패스 없이 루트(`/`)에 얹으면 `/issues/5`·`/post/12` 딥링크가 API JSON 과 충돌하므로 권장하지 않는다.

---

## 5. 체크리스트

- [ ] `EXPO_PUBLIC_API_BASE_URL` / `EXPO_PUBLIC_WEB_BASE_URL` 을 운영 호스트로 지정해 빌드했는가(폴백 IP 금지).
- [ ] 웹앱 오리진에서 API 호출이 CORS 통과하는가(운영에선 `origins` 화이트리스트).
- [ ] 딥링크(`/issues/5`, `/post/12`, `/community`) 새로고침 시 SPA fallback 으로 index.html 이 뜨는가.
- [ ] 데스크톱(≥1240)·모바일 폭에서 레이아웃 전환 확인(브라우저 창 리사이즈).
- [ ] 테스트존(`/tests`)이 iframe 으로 `/t` 를 정상 임베드하는가(혼합콘텐츠 방지 위해 https 통일).
- [ ] API 주소 변경 시 재빌드·재배포.

---

## 6. 로컬 확인

```bash
cd app
npx expo export --platform web --output-dir dist
npx serve dist            # 또는 python -m http.server -d dist 8080
# 브라우저에서 창 폭 ≥1240 ↔ <1240 리사이즈로 레이아웃 전환 확인
```
