# 오늘연애 디자인 업데이트 스펙 (DESIGN_UPDATE.md)

거의 완성된 오늘연애 앱(React Native + Expo)에 적용할 디자인 개선 3종.
**기능·API·비즈니스 로직은 일절 변경하지 않는다. 프레젠테이션 레이어(컴포넌트·스타일)만 교체한다.**
기존 디자인 토큰은 그대로 유지: ink #17181C · sub #9398A1 · line #F0F1F3 · soft #F7F8F9 · rose #F23B5F / rose-bg #FDEAEE · blue #3B72F0 / blue-bg #EAF0FE.

---

## 1. 기본 아바타 시스템 (신규)

에셋: `assets/avatars/av_01.svg` ~ `av_12.svg` (12종, 배경 원 포함된 완성형 64×64).
av_01 하트토끼 / 02 새침냥이 / 03 곰돌이 / 04 병아리 / 05 멍뭉이 / 06 여우 / 07 햄찌 / 08 펭귄 / 09 개구리 / 10 판다 / 11 오리 / 12 꿀꿀이

**구현**
- `react-native-svg` + `react-native-svg-transformer` 설정 후 SVG를 컴포넌트로 import (또는 SVGR 변환). `<Avatar userId={} profileImg={} size={} />` 공용 컴포넌트 신설.
- 배정 로직: `avatarNo = user_id % 12` (서버 users 테이블에 `avatar_no` 컬럼이 없으면 추가, 가입 시 저장. 기존 유저는 마이그레이션 스크립트로 일괄 채움).
- 우선순위: `profile_img` 있으면 이미지(원형 크롭), 없으면 기본 아바타.
- 표시 크기: 피드 카드 34 / 댓글 28 / 대댓글 24 / 프로필 화면 56 / 설정·상단 32.
- 기존의 이니셜 원·placeholder 아바타는 전부 이 컴포넌트로 교체.
- 가입 완료 화면에 "당신의 아바타는 하트토끼!" 한 줄 노출 (재미 요소, 텍스트만).

## 2. 피드 카드 리디자인

기존 오늘연애 피드 카드를 아래 구조로 교체 (토큰은 기존 것 사용).

```
[카드] bg #FFFFFF, border 0.5 line, radius 18, padding 16/17/13, 카드 간격 10
 ├ 헤더 행: Avatar(34) + [닉네임 13/600 + 상태칩(기존 유지)] 
 │          [메타 11.5 sub: 카테고리 · n시간 전 · 조회 n]   ← 조회수는 여기(메타줄)에만
 ├ 본문 행 (marginTop 11): 
 │   제목 15/600 ink (letterSpacing -0.4, lineHeight 1.45)
 │   본문 미리보기 13.5/400 #4E5968, 2줄 ellipsis (marginTop 4)
 │   └ 이미지 첨부 글: 우측 66×66 radius 12 썸네일 (resizeMode cover)
 ├ 투표형 글: 제목 아래에 기존 투표 UI 유지하되 버튼 색만 rose/blue 채움형으로 통일
 └ 액션 행 (marginTop 12): 알약 버튼 2개
     [♡ 공감 n] [댓글 n] — border 0.5 line, bg soft, radius 17, padding 6/12,
     텍스트 12.5/500 #4E5968. 눌림(공감 활성): bg rose-bg, border #F8C3CE, 텍스트 rose, 600
```

- 말머리(썰·고민·질문 등 기존 분류)는 제목 앞 미니 뱃지로: rose-bg 배경 + rose 텍스트 10.5/700, radius 6, padding 2/6.
- 카드 사이 구분은 그림자 없이 헤어라인 보더만. 그림자·elevation 제거.

## 3. 오늘의 질문 카드 (피드 최상단)

위치: 오늘연애 피드(커뮤니티 메인) 리스트의 헤더 컴포넌트로 최상단 고정. **활성 질문이 있을 때만 렌더** (없으면 카드 자체 미노출).

```
[카드] 피드 카드와 동일한 틀 (bg white, border line, radius 18)
 ├ 라벨: "오늘의 질문" 11.5/700 sub
 ├ 질문: 14/600 ink, lineHeight 1.55 (marginTop 8)
 ├ 선택지 (marginTop 11):
 │   · 2지선다(VS형): 가로 2버튼 — 좌 rose 채움 / 우 blue 채움, radius 12,
 │     padding 11, 텍스트 13/700 #fff
 │   · 3지 이상: 세로 버튼 — bg soft, border #E3E6EA, radius 12, 텍스트 13/600
 ├ 응답 후 상태: 버튼 dim(opacity .4, 선택한 것만 유지) + 결과 영역 표시
 │   결과 바: 선택지명(12/600) + 트랙(높이 8, bg #F2F3F5, radius 5) 
 │            + 채움(rose/blue) + 퍼센트(12/700 ink)
 │   참여 수: "n명 참여" 11.5 sub2
 └ 하단: "지난 질문 보기" 12/600 sub 밑줄 링크 → 지난 질문 3개 인라인 토글
         (질문 + 1위 답변·비율 한 줄씩)
```

- 응답은 계정당 하루 1회, 응답 즉시 결과 공개 (서버 API가 이미 있으면 그대로 사용, 결과 비율만 응답에 포함되게 확인).
- 상단 어디에도 Day 카운트·참여자 수 사전 노출하지 않음 (응답 후에만 참여 수 표시).

## 4. 적용 순서 & 검증

1. Avatar 컴포넌트 + 에셋 등록 → 전 화면 아바타 교체 → 화면별 확인
2. 피드 카드 교체 (텍스트글/이미지글/투표글 3가지 케이스 확인)
3. 오늘의 질문 헤더 카드 (질문 있음/없음, 응답 전/후 4상태 확인)
4. 각 단계마다 git commit. 기존 테스트 있으면 전부 통과 확인.
5. 스타일 값은 이 문서 수치 그대로. 임의 변경 금지. 애매하면 DECISIONS.md에 기록 후 진행.

---

## 5. 오늘의 연애 이슈 (신규 — 먼저 개발)

운영자가 하루 1건 큐레이션하는 연애·결혼 이슈 카드. 기존 투표 시스템에 얹는 가벼운 기능.

**위치**: 피드 리스트 헤더에서 "오늘의 질문" 카드 바로 아래. 활성 이슈가 있을 때만 렌더.

**카드 구조** (피드 카드와 동일한 틀):
```
라벨 "오늘의 연애 이슈" 11.5/700 sub
기사 제목 14/600 ink 2줄
요약 12.5/400 #4E5968 2줄 + [출처명 · 원문 보기↗] 11.5 sub (탭 → 외부 브라우저 아웃링크)
붙은 투표: 2지선다 가로 버튼 (rose/blue 채움, 오늘의 질문과 동일 UI·동일 결과바)
하단: 댓글 n → 탭하면 이슈 상세 화면(요약+투표결과+댓글 목록)
```

**DB**
```sql
issues(id PK, title VARCHAR(120), summary VARCHAR(200), source VARCHAR(30), url VARCHAR,
       poll_option_a VARCHAR(30), poll_option_b VARCHAR(30), starts_at, is_active TINYINT)
issue_votes(user_id, issue_id, side ENUM('a','b'), created_at, PK(user_id, issue_id))
```
댓글은 기존 comments 구조에 target_type 확장(또는 issue_comments 별도) — 기존 코드 관례 따름.

**운영 규칙 (관리자 화면에 등록 폼 추가)**
- 하루 1건, 새 이슈 등록 시 이전 이슈 자동 비활성. 지난 이슈는 아카이브 리스트(선택 구현).
- 기사 본문 전재 금지 — 제목 + 자체 요약 2줄 + 아웃링크만 (저작권).
- 큐레이션 가이드: 통계·트렌드·정책·설문 기사 위주. 연예인 열애설·사생활 가십은 금지 (명예훼손·악플 리스크).
- 투표 문구는 이슈에서 파생 ("축의금 10만원, 적당하다 vs 짜다").

## 6. 연애 심리테스트존 (신규 — 바이럴 유입 엔진)

**아키텍처 (중요)**: 테스트는 앱 내부가 아니라 **웹(Flask)으로 구현**한다.
이유: ① 공유 링크가 웹 랜딩으로 떨어져야 비유저 유입·카톡 공유·SEO가 작동 ② 마케팅광장 바이럴 퀴즈 퍼널 코드(문항 흐름·결과 페이지·유입 추적) 재활용 ③ 테스트 추가가 앱 업데이트 없이 가능.
앱에서는 WebView 스크린 1개로 테스트존을 띄운다 (react-native-webview, 이 화면만).

**웹 플로우**: 테스트 목록 → 인트로(커버+시작) → 문항(진행바) → 결과 페이지.
- 채점: **유형 집계형** — 선택지마다 유형 코드 매핑, 최다 선택 유형이 결과 (동점 우선순위는 테스트별 정의). 점수 합산형도 스키마상 지원.
- 비로그인 참여 허용. 결과 페이지에서 "결과 저장하고 내 유형 뱃지 받기" → 가입 유도 (앱 설치 링크 + 웹 가입).
- 결과 유형은 **기본 아바타 12종 캐릭터에 매핑** (예: 직진 하트토끼형, 밀당 여우형, 신중 곰돌이형…) — 에셋 재활용 + 브랜드 통일 + 결과 카드가 귀여워져 공유율 상승.
- 공유: 결과별 OG 이미지(제목+캐릭터), 카카오톡 공유 버튼, 링크 복사. URL에 ?ref= 유입 추적 파라미터.

**DB**
```sql
tests(id PK, slug UNIQ, title, intro VARCHAR(200), cover_img, is_active, created_at)
test_questions(id PK, test_id FK, sort_order, question VARCHAR(200),
               choice1 VARCHAR(80), choice1_code VARCHAR(10), choice2..., choice3 NULL...)
test_results(id PK, test_id FK, code VARCHAR(10), title VARCHAR(60),
             catchphrase VARCHAR(60), description TEXT, match_code VARCHAR(10),
             clash_code VARCHAR(10), avatar_no TINYINT)
test_attempts(id PK, test_id FK, anon_uuid CHAR(36), user_id NULL, result_id FK,
              ref VARCHAR(30) NULL, created_at)   -- 퍼널 지표: 참여→공유→가입 전환
```

**앱 통합**
- 진입점: 피드 상단(질문·이슈 카드 아래)에 테스트 홍보 카드 — 신규 테스트 출시 후 7일간 노출 ("NEW · 나의 연애 유형 테스트 →").
- 더보기/마이 메뉴에 "테스트존" 항목 상시.
- 내 결과 유형 뱃지: 프로필에 유형 캐릭터 미니 표시 (가입 유저가 결과 저장한 경우).
- 신규 테스트 출시 시 푸시 1회.

**운영**: 주 1개 목표. 문항·결과 문구는 Claude로 초안 생산 후 감수.
**1호 테스트 콘텐츠는 `tests/test01_love_type.md`에 완성본 포함** — 12문항·6유형(아바타 매핑·궁합·결과 페이지 요구사항까지). 이 파일을 시드 데이터로 변환해 DB에 등록하고 결과 페이지를 구현할 것. 이후 테스트도 같은 MD 포맷으로 추가한다.

## 7. 전체 적용 순서 (갱신)

1. 아바타 시스템 → 2. 피드 카드 → 3. 오늘의 질문 카드 → 4. 오늘의 연애 이슈(§5) → 5. 심리테스트존 웹(§6, Flask 쪽) → 6. 앱 WebView 연동·홍보 카드 → 각 단계 커밋 + 테스트.
