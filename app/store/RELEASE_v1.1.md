# v1.1 릴리즈 런북 — 운세 AI 켜기 → Play 업데이트 → App Store 첫 출시

한 번에 순서대로. 각 단계는 **앞 단계가 끝나야** 하는 것만 순서 표시했고, 나머지는 병렬 가능.

## 0. 현재 상태 (2026-08-27)

| 항목 | 상태 |
|---|---|
| 코드 | v1.1.0 완성·푸시됨 — 운세(AI 매일 생성)·속마음이야기·전화면 GNB·글로벌(ko/en)·개발로그인 제거 |
| 서버 | 운세·글로벌·속마음이야기 배포 완료. **AI 운세 키만 미설정**(현재 폴백 문구 모드) |
| Google Play | v1.0 프로덕션 게시됨 (운세 없음) |
| App Store | 앱 레코드만 있음, "1.0 제출 준비 중" — 빌드·메타데이터 전부 비어있음 |

---

## STEP 1 — 서버: 운세 AI 켜기 (앱과 무관, 오늘 바로)

1. [console.anthropic.com](https://console.anthropic.com) → API Keys → **Create Key** → `sk-ant-…` 복사. Billing에 결제수단 + 선불 크레딧 $10.
2. MobaXterm(211.45.175.195 root)에서 — `sk-ant-여기에키`만 교체:
```bash
S=/srv/todaylove/app-repo/server; V=$S/.venv; cd "$S"
git -C /srv/todaylove/app-repo pull && "$V/bin/pip" -q install -r requirements.txt && "$V/bin/python" -c "import anthropic;print('anthropic',anthropic.__version__)"
grep -q '^ANTHROPIC_API_KEY=' .env || echo "ANTHROPIC_API_KEY=sk-ant-여기에키" >> .env
grep -q '^FORTUNE_MODEL=' .env || echo "FORTUNE_MODEL=claude-sonnet-5" >> .env
systemctl restart todaylove && sleep 2 && systemctl is-active todaylove
export FLASK_APP=wsgi:app; TMR=$(TZ=Asia/Seoul date -d tomorrow +%F)
"$V/bin/flask" fortune-generate --date $TMR --overwrite --lang ko
"$V/bin/flask" fortune-generate --date $TMR --overwrite --lang en
```
3. 성공 판정: `운세 생성(ko): … (AI 48 / 폴백 0)` — en도 동일. `AI 0`이면 키/크레딧 문제(서비스는 폴백으로 정상).
4. 비용: Sonnet 5 기본 월 $4~8. `FORTUNE_MODEL=claude-opus-5`면 월 $10~20.

## STEP 2 — Play 라이브 v1.0 카카오 로그인 살리기 (5분, STEP 1과 병렬)

1. Play Console → 설정 → **앱 서명** → "앱 서명 키 인증서" **SHA-1** 복사 → Claude에게 전달 → base64 키해시 변환
2. 카카오 개발자 콘솔 → 앱 → 플랫폼 → Android → 키 해시에 **추가**(기존 EAS 해시는 유지)
3. `APP_INSTALL_URL`은 서버 `.env`에 이미 설정됨

## STEP 3 — Android v1.1 빌드 → 내부 테스트 → 프로덕션

```bash
cd app && npx eas-cli build --profile production --platform android
```
(20~30분. 신규 네이티브 모듈 5개라 OTA 불가, 풀 빌드 필수)

1. Play Console → 테스트 → **내부 테스트** → 새 버전 → AAB 업로드 → 본인 이메일 테스터 → 폰 설치
2. 실기기 확인 체크리스트:
   - [ ] 로그인 화면에 "개발용 로그인" 없음
   - [ ] 오늘연애(중앙 하트) 탭 → 온보딩 4스텝 → 운세 표시 (STEP 1 했으면 AI 문구)
   - [ ] 글 상세에서 하단 GNB 보임 → 댓글 입력창 탭하면 GNB 숨고 키보드 위에 입력창
   - [ ] 마이 > 속마음이야기 → 커플 연결 안내 (커플 계정 2개면 서로 보이는지)
   - [ ] 카카오 로그인 (STEP 2 후)
3. 이상 없으면 **프로덕션 → 새 버전 → 같은 AAB(라이브러리에서 추가)** → 출시노트(아래) → 검토 전송
4. **스토어 등록정보 갱신** (프로덕션 제출과 같이): 간단한 설명·자세한 설명을 아래 "v1.1 스토어 카피"로 교체
5. 심사 메모(앱 액세스 권한 안내문에 한 줄 추가): "운세 알림은 온보딩에서 명시 동의한 사용자에게만 발송되며 마이 > 운세 설정에서 즉시 해제 가능"

## STEP 4 — App Store 첫 출시 (STEP 3과 병렬 가능, 같은 코드)

### 4-1. 제출 차단 경고 3개 먼저 (App Store Connect)
1. **사용권 계약**: [developer.apple.com/account](https://developer.apple.com/account) → 노란 배너 → 업데이트된 계약 **동의** (계정 소유자만)
2. **EU 거래자(DSA)**: App Store Connect → 비즈니스 → 거래자 정보 → 개인이면 **비거래자** 선택
3. **연령 등급**: 앱 정보 → 연령 등급 → 새 소셜 미디어 문항 답변 (UGC·사용자 소통 "예" → 17+)

### 4-2. 앱 정보 (앱 정보 메뉴)
- 이름 `오늘연애` / 부제 `자정 연애운세·연애 커뮤니티` / 카테고리 **소셜 네트워킹** / 콘텐츠 권한: 해당 없음
- 개인정보 정책 URL `https://todayloves.com/privacy`
- **앱 개인정보(수집 항목)**: Play data-safety.md와 동일 — 이메일·사용자ID·앱활동·사진·기기ID / 앱 기능용 / 추적 없음

### 4-3. 버전 페이지 (iOS 앱 1.0 → **1.1.0**으로 버전 문자열 수정)
- 스크린샷: `app/store/marketing_ios/01~05.png` (1290×2796) → **iPhone 6.7"** 탭 업로드 (6.5" 요건도 충족)
- 프로모션 텍스트(170자) / 설명(4000자) / 키워드(100자) / 지원 URL / 마케팅 URL → 아래 "App Store 카피"
- 저작권 `2026 HCO` / 버전 출시 노트 → 아래
- **앱 심사 정보**: 로그인 필요 ✔ → `reviewer@todayloves.com` + review-account.md 비밀번호. 메모: "iOS는 Apple 로그인·이메일 가입 제공. 커뮤니티 UGC는 신고·차단·가이드라인(https://todayloves.com/guidelines) 운영. 운세 알림은 사용자 동의 기반."
- 가격: 무료 / 배포 국가: 대한민국 (우선)

### 4-4. 빌드 → TestFlight → 제출
```bash
cd app && npx eas-cli build --profile production --platform ios
npx eas-cli submit --platform ios --latest
```
(EAS가 인증서·프로비저닝·APNs 키 자동 처리. Apple 계정 로그인 프롬프트 1회)
1. App Store Connect → TestFlight에 빌드 뜨면(처리 10~30분) 본인 iPhone으로 위 STEP 3-2 체크리스트 동일 확인
2. 버전 페이지 → 빌드 섹션 → 해당 빌드 선택 → **심사에 추가** → 보통 1~3일

## STEP 5 — 게시 후
- [ ] Play/App Store 게시 확인 → 스토어 링크로 직접 설치·로그인
- [ ] 다음날 `tail /var/log/todaylove-fortune.log` → 크론이 `(AI 48 / 폴백 0)`으로 돌았는지
- [ ] 텔레그램 알림 원하면 `.env`에 `TELEGRAM_BOT_TOKEN`/`TELEGRAM_CHAT_ID` (AI 실패·폴백 시 알림)

## STEP 6 — 다음 (v1.1 안정 후, 빌드 불필요)
- Play: 스토어 등록정보 **en-US** 추가(앱명 TodayLoves) + 배포 국가 미국·필리핀
- App Store: 영어 현지화 + 국가 추가
- K-Story 파이프라인 첫 승인 (`/admin/kstory`)

---

## v1.1 스토어 카피

### Play — 간단한 설명 (80자)
```
매일 자정 나만의 연애운세부터 익명 연애 커뮤니티, 커플 속마음이야기까지. 오늘의 연애, 어느 편이세요?
```

### Play — 자세한 설명 (기존 listing.md 설명의 "■ 이런 기능이 있어요" 맨 앞에 추가)
```
🌙 오늘의 연애운세
매일 자정, 생년월일과 연애 상태에 맞춘 나만의 연애운이 도착해요.
연애운 점수·항목별 운세·행운의 아이템·오늘의 타로 한 장, 그 사람과의 궁합까지.
원하는 시간(자정/아침 7시/9시)에 알림으로 받아볼 수 있어요.

💞 속마음이야기 (커플)
여행·기념일·다툼 뒤에 "좋았던 점 · 아쉬웠던 점 · 개선할 점"을 양식대로 남기면
둘만 볼 수 있는 회고 노트가 쌓여요. 말로 하기 어려운 속마음을 서로 확인해보세요.
```

### Play — 출시 노트 v1.1
```
🌙 매일 자정 나만의 연애운세가 도착해요 — 점수·타로·궁합·행운 아이템
💞 커플 전용 '속마음이야기' — 좋았던 점/아쉬웠던 점/개선할 점을 둘만 나눠요
📱 모든 화면에서 하단 메뉴 유지, 글 상세에서 댓글 쓰기가 편해졌어요
```

### App Store
- **이름(30)**: `오늘연애`
- **부제(30)**: `자정 연애운세·연애 커뮤니티`
- **프로모션 텍스트(170)**: `매일 자정, 생년월일과 연애 상태에 맞춘 나만의 연애운이 도착해요. 익명 연애 고민 커뮤니티와 밸런스 투표, 커플 속마음이야기까지 한 앱에서.`
- **설명(4000)**: listing.md 자세한 설명 + 위 v1.1 추가 블록 (그대로 붙여넣기)
- **키워드(100)**: `연애운세,오늘의운세,타로,궁합,연애,커뮤니티,연애고민,밸런스투표,커플,심리테스트,연애상담,썸`
- **지원 URL**: `https://todayloves.com` / **마케팅 URL**: `https://todayloves.com` / **개인정보**: `https://todayloves.com/privacy`
- **출시 노트**: `오늘연애 첫 출시 🎉 매일 자정 연애운세, 익명 연애 커뮤니티, 밸런스 투표, 심리테스트, 커플 속마음이야기·D-day·오늘의 질문`
- **연령 등급**: 17+ (사용자 생성 콘텐츠, 성인 대상)
