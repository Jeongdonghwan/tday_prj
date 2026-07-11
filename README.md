# 썰전 (가칭)

연애 상태(커플·돌싱·유부) 기반 투표형 썰전 커뮤니티 앱. RN/Expo + Flask + MariaDB.
상세 스펙은 [BUILD_SPEC.md](BUILD_SPEC.md), 디자인은 `mockup_v2.html` / `mockup_v3.html` 참고.

> **현재 상태**: 착수 1~2단계 완료 — 앱 골격(theme·4탭·화면) + 서버 골격(전 테이블 + 소셜로그인 구조 + dev 로그인). 3단계(피드·상세·글쓰기·댓글)부터 기능을 쌓는다.

```
썰전/
├── app/      # Expo (React Native, expo-router) — iOS+Android 단일 코드
└── server/   # Flask REST API + MariaDB
```

---

## 1. 서버 (server/)

### 사전 준비
- Python 3.12+ , Docker Desktop

### 실행
```bash
cd server

# 1) 로컬 MariaDB (Docker). 호스트 3306 충돌 회피 위해 3307 로 노출됨.
docker compose up -d

# 2) 가상환경 + 의존성
py -m venv .venv
.venv/Scripts/python.exe -m pip install -r requirements.txt   # (mac/linux: source .venv/bin/activate)

# 3) 환경변수
cp .env.example .env            # 필요시 값 수정 (DEV_LOGIN_ENABLED=true 면 dev 로그인 가능)

# 4) 마이그레이션 적용 (전 테이블 생성)
.venv/Scripts/python.exe -m flask --app wsgi db upgrade
#   (스키마 변경 후엔: ... db migrate -m "메시지"  →  ... db upgrade)
#   빠른 부트스트랩만 필요하면: ... flask --app wsgi init-db  (create_all)

# 5) 서버 실행
.venv/Scripts/python.exe -m flask --app wsgi run --port 5000
```

### dev 로그인 E2E (키 없이 인증 경로 테스트)
```bash
curl -X POST http://127.0.0.1:5000/auth/social \
  -H "Content-Type: application/json" \
  -d '{"provider":"dev","social_id":"tester1"}'
# → { token, user, is_new }

curl http://127.0.0.1:5000/me -H "Authorization: Bearer <token>"   # → 유저 정보
```

### 구현 상태
- **완전 구현**: `POST /auth/social`(kakao/apple 검증 골격 + dev 모의 로그인 → 자체 JWT), `GET /me`, `/health`
- **라우트 골격(501)**: posts/comments/best/daily/couple/schedules/reports·blocks — 스펙 §7 전 경로 등록, 단계별 TODO
- DB 스키마: 스펙 §6 전 테이블을 SQLAlchemy 모델로 정의(= Alembic 마이그레이션). `schema.sql` 은 동치 raw SQL.

### 운영 메모 (스펙 §8, 카페24 2GB)
- Gunicorn 워커 2~3개: `gunicorn -w 2 -k gthread --threads 4 -b 127.0.0.1:8000 wsgi:app`
- 커넥션 풀은 `config.py` 에서 보수적 설정. 이미지 외부 스토리지·hot_score 배치·Redis 는 후속 단계.
- **DB 버전**: 로컬은 `mariadb:10.11`(LTS). 운영 MariaDB 버전과 맞추는 것을 권장.
  (참고: PyMySQL 은 MariaDB 11.4 의 gssapi 핸드셰이크와 충돌 사례가 있어 10.11 사용)

---

## 2. 앱 (app/)

### 사전 준비
- Node 20+ , Expo Go(실기기) 또는 Android/iOS 시뮬레이터

### 실행
```bash
cd app
npm install

# API 주소 지정 (실기기면 PC 의 LAN IP, 시뮬레이터면 localhost)
# .env 파일에:  EXPO_PUBLIC_API_BASE_URL=http://<PC-IP>:5000
npm start            # QR 코드 → Expo Go, 또는 a(android)/i(ios)
```

### 로그인
- 카카오/애플 버튼은 네이티브 SDK 배선 전(후속 단계). 지금은 화면 하단 **개발용 로그인**으로
  `social_id` 입력 후 로그인 → 서버 dev 경로로 JWT 수신 → 탭 화면 진입.

### 구조
- `src/theme/` — 디자인 토큰(색·라운드·타이포, 스펙 §4). 단일 출처.
- `src/components/` — `StatusChip`(상태칩), `Icon`(목업 라인 아이콘 포팅), `PostCard`, `AppBar`, `FilterRow`
- `src/app/` — expo-router 라우트
  - `(auth)/login` · `(tabs)/{index,best,daily,my}` · `post/[id]` · `write` · `couple/connect` · `calendar`
  - 하단 4탭(홈·BEST·오늘의 질문·MY) + 우하단 로즈 플로팅 글쓰기 FAB
- `src/api/` , `src/auth/` — API 클라이언트 + 토큰(SecureStore) 인증 컨텍스트
- 화면은 목업(v2/v3) 디자인을 반영한 **정적 골격**. 실데이터 연동은 3단계+.

---

## 3. 다음 단계 (스펙 §11)
3. 썰전 피드·상세·글쓰기(투표 on/off)·댓글 → 커뮤니티 코어
4. BEST(hot_score 배치) + 신고/차단
5. 오늘의 질문(1인 모드) → 6. 커플 연결·캘린더·D-day → 7. 위젯 → 8. 푸시·EAS 빌드
- 실제 카카오/애플 네이티브 SDK 배선(prebuild)은 API 키 확보 후.
