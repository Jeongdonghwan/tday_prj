# 배포 전 준비 가이드 (사용자 할 일)

앱스토어/플레이스토어 출시 전에 **당신이 직접** 처리해야 하는 것들을 순서대로 정리했습니다.
코드로 끝낼 수 있는 부분(계정 삭제, 애플 토큰 검증, 카카오 로그인 앱 플로우, 시크릿 하드닝)은
이미 반영되어 있고, 아래는 **키·계정·인프라**처럼 코드로 대신할 수 없는 작업들입니다.

> 우선순위: **A(출시 차단) → B(출시 직후) → C(안정화)**

---

## A. 출시 차단 (이거 없으면 심사/로그인 불가)

### A-1. 카카오 로그인 (앱=네이티브 SDK / 웹=서버 OAuth)
> **중요:** 카카오 Redirect URI 는 **http/https 만** 허용하고 커스텀 스킴(`todaylove://…`)은
> 등록 불가입니다. 그래서 **앱은 네이티브 SDK**(Redirect URI 불필요), **웹은 서버가 OAuth 를 대신
> 처리**(Redirect URI 는 서버 콜백 1개)하도록 구현되어 있습니다.

**0) 앱 만들기 + 키 확인** ([카카오 개발자 콘솔](https://developers.kakao.com) → 애플리케이션 추가)
   - **앱 설정 → 앱 키** 에서 두 키를 사용: **네이티브 앱 키**(앱용), **REST API 키**(서버용)

**1) 플랫폼 등록** (앱 설정 → 플랫폼)
   - iOS 번들 ID `com.hco.todaylove`
   - Android 패키지 `com.hco.todaylove` (+ **키 해시** — EAS 빌드 후 키스토어 SHA 로 생성해 등록)
   - Web **사이트 도메인** (웹 로그인 쓸 도메인)

**2) 카카오 로그인 사용설정 ON** (제품 설정 → 카카오 로그인)
   - 활성화하면 그 아래 **Redirect URI** 칸이 나타납니다. (플랫폼 등록이 선행돼야 함)
   - **Redirect URI 등록**: `http://127.0.0.1:5000/auth/kakao/callback` (개발) +
     `https://<운영 서버 도메인>/auth/kakao/callback` (운영). ← **웹 로그인용, 이 1개면 됨**
   - 동의항목 최소(닉네임 정도)

**3) 키 배치**
   - **네이티브 앱 키** → `app/app.json` 의 `@react-native-seoul/kakao-login` 플러그인
     `kakaoAppKey` 값(`"YOUR_KAKAO_NATIVE_APP_KEY"` 자리)에 붙여넣기
   - **REST API 키** → 서버 `.env` `KAKAO_REST_API_KEY=` (이미 `c540…` 넣어두셨습니다 ✓)
   - (선택) 콘솔에서 **보안 → Client Secret** 발급 시 → 서버 `.env` `KAKAO_CLIENT_SECRET=`
   - 앱 `.env` 의 `EXPO_PUBLIC_KAKAO_REST_API_KEY` 는 **더 이상 안 씀 → 삭제**하세요.

**4) 앱(네이티브) 로그인은 EAS 개발빌드에서만 동작** (Expo Go 불가):
   ```bash
   cd app && eas build --profile development --platform android   # 또는 ios
   ```
   빌드 앱에서 카카오 버튼 → 카카오톡/카카오계정 로그인 → 자동 가입. (웹은 브라우저에서 바로 확인 가능)

### A-2. 애플 로그인 (iOS 필수 — 소셜 로그인 제공 시 애플 의무)
- **서버 검증은 이미 구현** 되어 있음(identity token 서명·aud·iss 검증). 아래만 하면 됨:
1. Apple Developer → App ID 에 **Sign In with Apple** capability 추가
2. **Service ID(또는 번들ID)** 를 서버 `.env` `APPLE_CLIENT_ID=` 에 설정 (토큰 aud 검증값)
   - `APPLE_TEAM_ID`, `APPLE_KEY_ID` 도 채워두기
3. **앱 측 네이티브 모듈 설치 필요** (현재 미설치):
   ```bash
   cd app && npx expo install expo-apple-authentication
   ```
   설치 후 로그인 화면 `onApple` 을 `AppleAuthentication.signInAsync()` → `identityToken` 을
   `signIn({ provider:'apple', token: identityToken })` 로 연결. (지금은 "준비중" 안내 상태)
   - iOS 전용 + **개발 클라이언트/실기기 빌드** 필요(Expo Go 불가)

### A-3. 운영 시크릿 (기본값이면 서버가 부팅 시 [보안 경고] 로그를 남김)
서버 `.env` 에 **강한 랜덤값**으로:
```bash
python -c "import secrets; print(secrets.token_urlsafe(32))"   # 아래 3개 각각 생성
```
- `SECRET_KEY=` (Flask 세션)
- `JWT_SECRET=` (토큰 위조 방지 — **바뀌면 기존 로그인 전부 만료**)
- `ADMIN_TOKEN=` (관리자 페이지 게이트)
- `DEV_LOGIN_ENABLED=false` (운영에서 반드시 꺼야 함 — 켜져 있으면 키 없이 로그인 가능)
- `FLASK_ENV=production`
> 참고: `server/.env.example`, `app/.env.example` 에 전체 항목 정리됨.

### A-4. CORS 도메인 제한
- 서버 `.env` `CORS_ORIGINS=https://www.도메인.co.kr` (콤마로 여러 개). 운영에서 `*` 는 경고 대상.

### A-5. 운영 DB + 마이그레이션
1. 운영 MariaDB 준비 → `DATABASE_URL=mysql+pymysql://user:pass@host:3306/db`
2. 스키마 반영:
   ```bash
   cd server && flask db upgrade      # 계정삭제(is_deleted) 등 최신 마이그레이션까지 적용
   ```
3. 콘텐츠 시드(심리테스트 등): `flask seed` (또는 `flask seed-love-tests`)

### A-6. 스토어 심사용 문서 URL — ✅ 페이지 구현 완료
- **이용약관·개인정보처리방침 페이지가 서버에 내장**되어 있습니다 (Jinja, `server/app/templates/terms.html`·`privacy.html`):
  - 개발: `http://127.0.0.1:5050/terms`, `http://127.0.0.1:5050/privacy`
  - 운영: `https://<서버 도메인>/terms`, `https://<서버 도메인>/privacy` ← **이 URL 을 스토어
    등록정보·카카오 간편가입(비즈앱)에 제출** (서버가 도메인에 배포되면 자동으로 유효)
- 로그인 화면 하단 "이용약관·개인정보처리방침" 문구에 링크 연결됨.
- 내용 중 **운영자명·연락처(이메일)** 는 본인 정보로 검토·수정하세요.
- **계정 삭제 경로 안내**: 앱 내 마이 → "회원 탈퇴" 로 삭제 가능(구현됨). 애플/구글 심사에서 요구.
- 앱 설치 링크가 생기면 서버 `.env` `APP_INSTALL_URL=` (테스트 결과 공유 CTA에 사용).

---

## B. 출시 직후 (푸시·빌드)

### B-1. 푸시 알림 (EAS)
1. `eas login` → `eas build:configure`
2. **Android(FCM)**: Firebase 프로젝트 → `google-services.json` 다운로드 → EAS 에 등록
3. **iOS(APNs)**: Apple 푸시 키(.p8) 발급 → `eas credentials` 로 등록
4. 앱은 이미 Expo Push 토큰을 서버에 저장하도록 되어 있음(마이/설정 진입 시).

### B-2. EAS 빌드 & 제출
```bash
cd app
eas build --platform all           # 스토어용 빌드
eas submit --platform ios          # App Store Connect
eas submit --platform android      # Play Console
```
- 앱 아이콘/스플래시/스토어 스크린샷·설명 준비.

### B-3. 이미지 업로드 서빙
- 현재 업로드는 서버 로컬 디스크(`UPLOAD_DIR`). 운영은 **nginx 로 정적 서빙** 권장:
  - `UPLOAD_DIR` 을 nginx `location /uploads/` 로 매핑, `WEB_BASE_URL` 을 실제 도메인으로.
- (추후) 트래픽 늘면 S3/오브젝트스토리지 이전 고려.

---

## C. 안정화 (운영 자동화·모니터링)

### C-1. 크론(cron) 등록 — 배치 작업
서버에서 주기 실행 (경로·venv 는 환경에 맞게):
```cron
# hot_score 재계산 (베스트/홈 랭킹) — 5분마다
*/5 * * * *  cd /srv/todaylove/server && /srv/todaylove/server/.venv/bin/flask recompute-hot >> /var/log/todaylove/hot.log 2>&1

# 오늘의 질문 도착 푸시 — 매일 오전 9시
0 9 * * *    cd /srv/todaylove/server && /srv/todaylove/server/.venv/bin/flask notify-daily >> /var/log/todaylove/daily.log 2>&1

# 베스트 등재 알림 — hot 배치 후 (매일 오전 9시5분)
5 9 * * *    cd /srv/todaylove/server && /srv/todaylove/server/.venv/bin/flask notify-best >> /var/log/todaylove/best.log 2>&1
```
> 실행 전 `FLASK_APP` 환경변수(예: `run:app` 또는 팩토리 경로)와 `.env` 로딩 확인.

### C-1.5. 검색엔진 등록 (배포 후 — SEO 인프라는 코드에 내장됨)
서버에 이미 있음: robots.txt, sitemap.xml(글+테스트+약관), 페이지별 title/description/OG/canonical.
배포되면 아래만 하면 됨:
1. [구글 서치콘솔](https://search.google.com/search-console) → 속성 추가(todayloves.com) →
   "HTML 태그" 방식 선택 → content 값 복사 → 서버 `.env` `GOOGLE_SITE_VERIFICATION=` → 서버 재시작 → 확인 클릭
2. [네이버 서치어드바이저](https://searchadvisor.naver.com) → 사이트 등록 → 동일하게
   content 값 → `NAVER_SITE_VERIFICATION=` → 확인
3. 두 콘솔 모두에서 **사이트맵 제출**: `https://todayloves.com/sitemap.xml`
4. (선택) 네이버는 "웹마스터 도구 → 수집 요청"으로 주요 페이지 즉시 수집 요청 가능

### C-2. 에러 모니터링
- Sentry(또는 유사) 연동 권장 — 서버 500·앱 크래시 추적.

### C-3. 웹(정적) 배포
- 심리테스트존 등 웹 산출물: `WEB_DEPLOY.md` 참고 (`expo export --platform web`).

---

## 요약 체크리스트
- [ ] 카카오: 네이티브 앱 키(app.json 플러그인) + REST 키(서버 .env) + 플랫폼 등록 + Redirect URI `…/auth/kakao/callback`(웹)
- [ ] 애플 `APPLE_CLIENT_ID` + `expo-apple-authentication` 설치·연결
- [ ] `SECRET_KEY`/`JWT_SECRET`/`ADMIN_TOKEN` 강한 값, `DEV_LOGIN_ENABLED=false`, `FLASK_ENV=production`
- [ ] `CORS_ORIGINS` 도메인 제한
- [ ] 운영 DB + `flask db upgrade` + 시드
- [ ] 개인정보처리방침/이용약관 URL, 계정삭제 안내
- [ ] 푸시 자격증명(FCM/APNs), EAS 빌드·제출
- [ ] 업로드 nginx 서빙 + `WEB_BASE_URL`
- [ ] cron 3종 등록, 에러 모니터링
