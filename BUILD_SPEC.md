# 썰전 (가칭) — 개발 착수 스펙 (FINAL)

연애 상태 기반 썰전 커뮤니티 앱. 안드로이드 + iOS 동시 출시.
이 문서 하나로 개발 착수한다. 첨부된 HTML 목업(mockup_v2 / mockup_v3)을 디자인·구조 기준으로 본다.

---

## 0. 제품 한 줄 정의

연애 상태(커플·돌싱·유부)를 가진 사용자들이 **투표형 썰전**으로 모이고,
**오늘의 질문**으로 매일 들어오고, **커플 기능**으로 머무는 커뮤니티 앱.

핵심 메커니즘
- **상태칩** = 모든 글·댓글·프로필에 붙는 세그먼트 라벨. 콘텐츠를 가르는 환승역.
- **썰전** = 글 + 작성자가 직접 만든 2지선다 투표 + 댓글. 캡쳐·바이럴 유도.
- **오늘의 질문** = 매일 1개 텍스트 질문. 혼자 답해도 쌓이고(1인 모드), 커플 연결 시 서로 답 공개.

---

## 1. 개발 범위 (전체)

만든다
- 소셜로그인 (카카오 + 애플)
- 썰전 피드 (홈) / 썰전 상세 (투표 + 댓글)
- BEST (인기글 + 베스트 댓글, 기간·카테고리 필터)
- 글쓰기 (투표 on/off, 선택지 직접 입력)
- 오늘의 질문 (1인 모드 + 커플 연결 시 답 공개)
- 마이페이지 (상태 전환, D-day, 연속답변, 내 활동)
- 커플 연결 (초대 코드 + 연애 시작일)
- 공유 캘린더 (둘의 일정 색 구분)
- 홈 화면 위젯 (D-day + 오늘의 질문)
- 신고 / 차단 (커뮤니티 필수, 애플 심사 요건)

안 만든다 (이번 범위 밖)
- 돌싱 매칭 / 블라인드 소개팅 → 돌싱 풀이 쌓인 뒤 별도 검토
- 데이트·맛집 제휴 → 제휴 환경 갖춰진 뒤
- 멤버십·인앱결제 → 트래픽 검증 뒤

돌싱은 매칭은 없지만 **상태칩·커뮤니티에는 포함**된다(블루 칩). 풀을 조용히 쌓는 목적.

---

## 2. 기술 스택

| 영역 | 선택 | 비고 |
|---|---|---|
| 앱 | **React Native + Expo (SDK 53+)** | iOS+Android 단일 코드. expo-router |
| 백엔드 | **Flask (REST API) + Gunicorn + Nginx** | 기존 스택 재활용 |
| DB | **MariaDB** | |
| 캐시 | 메모리 캐시 (초기) → Redis (트래픽 증가 시) | |
| 이미지 | **외부 오브젝트 스토리지** (Cloudflare R2 / S3) | 서버 디스크 저장 금지 |
| 푸시 | **Expo Push Notifications** | |
| 서버 | **카페24 가상서버 비즈니스 (2GB RAM / 40GB SSD / 500GB 트래픽)** | 국내, 익숙한 환경 |

위젯
- iOS: **expo-widgets** (Expo UI 컴포넌트, 네이티브 코드 최소화)
- Android: **react-native-android-widget** (Expo config plugin)
- 데이터 공유: **App Group** (앱↔위젯). app.json에 App Group 설정 → prebuild가 네이티브 권한 변환

---

## 3. 아키텍처

```
[RN/Expo 앱 (iOS+Android)] --HTTPS/JSON--> [Nginx -> Gunicorn -> Flask API] --> [MariaDB]
        |                                                                          |
   [홈 위젯]                                              [메모리/Redis 캐시] / [오브젝트 스토리지(이미지)]
   App Group 공유
```

원칙
- 비즈니스 로직 전부 서버. 앱은 화면·상태만. (버전 파편화·심사 리스크 최소화, OTA 업데이트 활용)
- API는 **반드시 HTTPS** (애플 ATS). 카페24 가상서버에 Let's Encrypt.
- 이미지는 1일차부터 외부 스토리지. 서버 디스크·트래픽 보호.

---

## 4. 디자인 시스템 (목업에서 추출 → theme 파일로)

```
색상 토큰
--ink:    #17181C   (기본 텍스트)
--sub:    #9398A1   (보조 텍스트)
--sub2:   #C2C6CC   (비활성)
--line:   #F0F1F3   (구분선)
--soft:   #F7F8F9   (옅은 배경)
--bg:     #FFFFFF

액센트 / 상태칩
--rose:   #F23B5F  / bg #FDEAEE   → 커플, 브랜드 메인 액센트
--blue:   #3B72F0  / bg #EAF0FE   → 돌싱
--navy:   #33425E  / bg #E8ECF4   → 유부

폰트: Pretendard (전 굵기). 위계는 weight로 (400/600/700/800)
라운드: 카드 16~18, 버튼 12~14, 칩 999(pill)
아이콘: 라인 아이콘(stroke 1.8~1.9). 이모지 UI 사용 금지.
```

상태칩 규칙
- 라벨: `커플` / `돌싱` / `유부` (2글자 고정)
- 모든 글·댓글·프로필 옆에 도트 + 텍스트 pill로 표시
- 글/댓글에는 **작성 시점 상태를 스냅샷**으로 저장 (나중에 바꿔도 과거 글은 유지)

하단 네비게이션 (4탭 + 플로팅)
- 탭: **홈 · BEST · 오늘의 질문 · MY**
- 글쓰기: 우하단 **플로팅 버튼**(로즈 원형). 탭에 넣지 않음
- 캘린더 진입은 마이페이지 또는 커플 영역에서

---

## 5. 화면 명세

목업 파일 대응: mockup_v2(홈/상세/질문/마이), mockup_v3(글쓰기/커플연결/캘린더/BEST)

1. **홈 — 썰전 피드** (`(tabs)/index`)
   - 카테고리 필터(전체/연애/결혼·부부/고민상담/자유)
   - 카드: 카테고리, 제목, 본문 2줄, 작성자+상태칩, (투표글이면)투표 게이지, 투표수·댓글수
   - "지금 뜨는 썰" 마크(hot)
   - 커서 페이지네이션 (무한 스크롤)

2. **썰전 상세** (`post/[id]`)
   - 본문 전체, 작성자+상태칩+조회수
   - 투표글: A/B 버튼 → 투표 후 % 결과로 전환. "내 선택" 표시. 중복 불가
   - 댓글: 대댓글, 좋아요. 댓글에도 상태칩
   - 신고/차단 진입(우상단 메뉴)

3. **오늘의 질문** (`(tabs)/daily`)
   - 오늘 질문 1개, 답변 입력
   - 연속 답변 스트릭 표시
   - 커플 연결 시: 둘 다 답하면 서로 공개. 답 갈리면 "썰전 올리기" 버튼
   - 미연결 시: 1인 모드(혼자 답 저장, "연결하면 상대 답도 볼 수 있어요" 안내)
   - 지난 질문 리스트(답 일치/갈림)

4. **BEST** (`(tabs)/best`)
   - 기간 필터: 실시간 / 오늘 / 주간
   - 카테고리 필터
   - 인기글 랭킹(1~3위 강조)
   - 베스트 댓글 모아보기

5. **마이페이지** (`(tabs)/my`)
   - 프로필(닉네임, 상태칩)
   - 커플 연결 시: D-day 카드(함께한 일수 + 다음 기념일)
   - 상태 전환 세그먼트(커플/돌싱/유부)
   - 스탯(연속답변 / 작성글 / 받은공감)
   - 내 활동(쓴 글/투표/스크랩/댓글)
   - 설정(차단 목록, 로그아웃 등)

6. **글쓰기** (`write`)
   - 카테고리 선택, 제목, 본문
   - 작성자 상태칩 자동 표시(선택 아님)
   - **투표 만들기 토글**: ON → A/B 선택지 입력칸 등장 (작성자 직접 입력)
   - 빈칸이면 AI 선택지 제안(서버에서 Claude API, 옵션)
   - 가이드: "둘 중 하나 고르게 적기"

7. **커플 연결** (`couple/connect`)
   - 초대 코드(6자리) 생성 → 카카오 공유
   - 받은 코드 입력
   - 연애 시작일 설정(둘 중 누구나 → 공유 적용, 일수 자동 계산)

8. **공유 캘린더** (`calendar`)
   - 월 그리드, 날짜 밑에 일정명 텍스트(색: 나=로즈, 상대=블루, 함께=네이비)
   - 2개 초과 시 "+N"
   - 하단 아젠다(선택일 일정), 일정 추가 FAB
   - 기념일 자동 표시

9. **홈 위젯**
   - 콘텐츠: D-day("OOO님과 327일째") + 오늘의 질문 상태("오늘 질문 도착")
   - 갱신: 일 단위(초 단위 아님)
   - 데이터: App Group 공유 저장소로 앱이 써주고 위젯이 읽음

---

## 6. DB 스키마 (MariaDB)

```sql
users (
  id BIGINT PK AUTO_INCREMENT,
  nickname VARCHAR(30) UNIQUE,
  social_provider ENUM('kakao','apple'),
  social_id VARCHAR(128),
  relationship_status ENUM('couple','single','married') DEFAULT 'single',
  couple_id BIGINT NULL,
  push_token VARCHAR(255) NULL,        -- Expo Push
  created_at DATETIME,
  INDEX idx_social (social_provider, social_id)
)

posts (
  id BIGINT PK,
  user_id BIGINT FK,
  category ENUM('love','marriage','counsel','free'),
  title VARCHAR(120),
  body TEXT,
  is_poll BOOLEAN DEFAULT FALSE,        -- 투표글/일반글 구분
  author_status ENUM('couple','single','married'),  -- 작성 시점 스냅샷
  view_count INT DEFAULT 0,
  like_count INT DEFAULT 0,
  comment_count INT DEFAULT 0,
  hot_score FLOAT DEFAULT 0,            -- BEST 정렬용, 배치 갱신
  is_blinded BOOLEAN DEFAULT FALSE,     -- 신고 누적 시 가림
  created_at DATETIME,
  INDEX idx_cat_created (category, created_at),
  INDEX idx_hot (hot_score DESC)
)

poll_options (
  id BIGINT PK,
  post_id BIGINT FK,
  side ENUM('A','B'),
  label VARCHAR(40),                    -- 작성자 입력 멘트
  vote_count INT DEFAULT 0
)

votes (
  id BIGINT PK,
  post_id BIGINT FK,
  user_id BIGINT FK,
  option_side ENUM('A','B'),
  created_at DATETIME,
  UNIQUE KEY uq_vote (post_id, user_id)   -- 중복투표 차단
)

comments (
  id BIGINT PK,
  post_id BIGINT FK,
  user_id BIGINT FK,
  parent_id BIGINT NULL,
  body TEXT,
  like_count INT DEFAULT 0,
  author_status ENUM('couple','single','married'),
  is_blinded BOOLEAN DEFAULT FALSE,
  created_at DATETIME,
  INDEX idx_post (post_id, created_at)
)

daily_questions (
  id BIGINT PK,
  question TEXT,
  scheduled_date DATE,
  INDEX idx_date (scheduled_date)
)

daily_answers (
  id BIGINT PK,
  question_id BIGINT FK,
  user_id BIGINT FK,
  couple_id BIGINT NULL,                -- 미연결이면 NULL (1인 모드)
  answer TEXT,
  created_at DATETIME,
  UNIQUE KEY uq_answer (question_id, user_id)
)

couples (
  id BIGINT PK,
  user_a BIGINT FK,
  user_b BIGINT FK NULL,
  invite_code VARCHAR(6) UNIQUE,
  start_date DATE NULL,
  created_at DATETIME
)

schedules (
  id BIGINT PK,
  couple_id BIGINT FK,
  owner ENUM('a','b','both'),
  title VARCHAR(80),
  event_date DATE,
  event_time TIME NULL,
  created_at DATETIME,
  INDEX idx_couple_date (couple_id, event_date)
)

reports (                               -- 신고
  id BIGINT PK,
  target_type ENUM('post','comment','user'),
  target_id BIGINT,
  reporter_id BIGINT FK,
  reason VARCHAR(50),
  created_at DATETIME
)

blocks (                                -- 차단
  id BIGINT PK,
  user_id BIGINT FK,
  blocked_user_id BIGINT FK,
  created_at DATETIME,
  UNIQUE KEY uq_block (user_id, blocked_user_id)
)
```

설계 못 박기 (자주 틀리는 곳)
- 투표/일반 분기는 `posts.is_poll`. 일반글은 poll_options 없음.
- 중복투표는 `votes` 유니크키로 **DB에서** 막는다.
- `daily_answers.couple_id` NULL 허용 = 1인 모드 보장.
- `author_status`는 작성 시점 스냅샷.
- `hot_score`는 실시간 계산 금지 → 5분 배치.
- 차단 시 피드·댓글에서 상대 콘텐츠 제외(쿼리에서 blocks 조인 필터).
- 신고 누적 임계치 넘으면 `is_blinded=true`로 자동 가림.

---

## 7. API 명세

```
POST   /auth/social          소셜 로그인 (kakao/apple)
GET    /me

GET    /posts?category=&cursor=
POST   /posts                글 작성 (is_poll, poll_options)
GET    /posts/{id}
DELETE /posts/{id}
POST   /posts/{id}/vote      { side }   중복 409
POST   /posts/{id}/like

GET    /posts/{id}/comments
POST   /posts/{id}/comments
POST   /comments/{id}/like

GET    /best?period=realtime|today|weekly&category=
GET    /best/comments

GET    /daily/today          오늘 질문 + 내 답변 여부 + (커플)상대 답변
POST   /daily/answer
POST   /daily/{question_id}/to-post   답 갈린 질문 → 썰전 글로 전환

POST   /couple/invite        초대코드 생성
POST   /couple/join          { code }
PATCH  /couple/start-date    { date }
GET    /couple/dday          위젯/마이용 D-day 데이터

GET    /schedules?month=
POST   /schedules
DELETE /schedules/{id}

POST   /reports              { target_type, target_id, reason }
POST   /blocks               { blocked_user_id }
GET    /blocks
DELETE /blocks/{id}

POST   /ai/poll-suggest      { title, body } → A/B 선택지 제안 (옵션)
```

- 페이지네이션은 커서(created_at+id). OFFSET 금지.
- 푸시: 오늘의질문 도착, 커플 답변 완료, 내 글 베스트 등재 등.

---

## 8. 서버 환경 & 최적화 (카페24 비즈니스 / 2GB RAM)

2GB RAM은 빠듯하므로 아래 필수:
1. **MariaDB 메모리 다이어트** — `innodb_buffer_pool_size`를 256~384M 정도로 보수적 설정. 2GB에서 OOM 방지.
2. **Gunicorn 워커 2~3개** (`workers = 2~3`, sync 또는 gthread). 과다 워커 금지.
3. **이미지 외부 스토리지** — 40GB SSD에 사용자 이미지 저장 금지. R2/S3로.
4. **응답 캐싱** — 피드·BEST는 메모리 캐시(초기). 매 요청 DB 조회 금지.
5. **hot_score 배치** — cron 또는 스케줄러로 5분 주기 갱신. BEST를 실시간 정렬 쿼리로 돌리지 말 것.
6. **인덱스** — category+created_at, hot_score DESC, votes/blocks 유니크키 필수.
7. **HTTPS** — Let's Encrypt + Nginx.
8. **DB 백업** — 일 1회 덤프(텍스트라 가벼움).

용량 감각
- 텍스트 데이터는 수 GB 수준까지 가벼움. 게시글 10만·댓글 100만 합쳐도 수 GB.
- 진짜 용량·트래픽 변수는 이미지 → 외부 분리로 해소.
- 이 설정이면 **단일 비즈니스 서버로 MAU 수천~1만 구간 커버**. 막히면 퍼스트클래스(3GB) 업 또는 Redis 도입.

앱용 가상서버는 **마케팅광장·고풍과 분리해서 새로** 판다(메모리 경쟁 방지).

---

## 9. 위젯 구현 메모

- iOS: `expo-widgets`로 D-day·오늘의질문 위젯. App Group 식별자(`group.com.xxx.shared`)를 앱·위젯 양쪽 타깃에 설정.
- Android: `react-native-android-widget` + Expo config plugin.
- app.json에 App Group / 위젯 설정 → `expo prebuild` → EAS Build.
- 갱신은 일 단위(D-day) + 오늘의질문 발행 시. 초 단위 카운트다운 불가(OS 정책).
- EAS Build 사용(맥 없이 iOS 빌드 가능).

---

## 10. 출시 체크리스트

계정·비용
- Apple Developer Program $99/년, Google Play $25 1회.
- v1 무료앱·인앱결제 없음 → 스토어 수수료 0.

심사 함정
- Google 개인 계정: 실제 테스터 12명 × 14일 비공개 테스트 의무 → 테스터 미리 확보.
- Apple: 심사 빠르나 완성도·개인정보처리방침 엄격.
- **애플 로그인 필수**(다른 소셜로그인 있으면 애플도 제공해야 함) → 카카오+애플 구성.
- **신고/차단 없으면 커뮤니티 앱 애플 리젝** → 반드시 포함(스키마/화면 반영됨).

출시 순서 권장
1. 안드로이드 먼저($25, 테스터 12명 준비)
2. 검증 후 iOS 추가(같은 RN 코드, 애플 $99/년)

출시 전 자산
- 개인정보처리방침 URL, 앱 아이콘/스플래시, 스토어 스크린샷, 푸시 권한 안내.

---

## 11. 개발 착수 순서 (제안)

1. Expo 프로젝트 + theme(디자인 토큰) + expo-router 탭 골격
2. Flask API 골격 + MariaDB 스키마 + 소셜로그인(카카오→애플)
3. 썰전 피드·상세·글쓰기(투표 on/off)·댓글 → 커뮤니티 코어
4. BEST(배치 hot_score) + 신고/차단
5. 오늘의 질문(1인 모드)
6. 커플 연결 + 캘린더 + D-day
7. 위젯(App Group 데이터 공유)
8. 푸시, 마무리, 스토어 빌드(EAS)

먼저 3번까지가 앱의 본체다. 여기부터 돌아가게 만들고 위로 쌓는다.
