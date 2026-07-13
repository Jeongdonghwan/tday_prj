# 디자인 업데이트 — 결정 기록 (DECISIONS.md)

`DESIGN_UPDATE.md` 적용 중 애매한 판단을 결정·기록한다. (하드룰: 기존 기능·API·비즈니스 로직 변경 금지, 프레젠테이션만 교체, 스타일 수치는 문서 값 그대로)

## 사용자 확인 결정
- **§3 오늘의 질문**: 신규 **커뮤니티 A/B 데일리 폴**(전체 응답 비율 + n명 참여) + **커플 상호 답 공개**(둘 다 응답 시 상대 선택 표시)로 구현. 기존 커플 자유서술형 "오늘의 질문" 탭/API(`/daily/*`)는 **무변경**, 신규 `/daily-poll/*` 추가. "오늘의 질문" 명칭이 (커플 탭)과 (피드 커뮤니티 카드)에 공존 — 의도된 선택.
- **관리자 등록 폼(§5 이슈, §6 테스트)**: Flask 웹 관리자 페이지(`/admin/*`, `ADMIN_TOKEN` 게이트)로 통일.

## 자율 결정
1. **아바타 렌더링**: `react-native-svg`의 `SvgXml` + 12 SVG를 XML 문자열로 번들(`app/src/avatars/`). `react-native-svg-transformer`·metro 설정·신규 네이티브 의존성 도입 안 함 → **Expo Go에서 리빌드 없이 동작**. 문서가 "SVGR 변환 또는" 대안을 허용하므로 준수. `profileImg` prop은 컴포넌트에 두되 업로드 기능이 없어 실사용은 항상 기본 아바타.
2. **avatar_no**: `user_id % 12 + 1` (1..12 → av_01..av_12, 1-indexed로 에셋/결과 매핑 일치). 기존 유저는 마이그레이션에서 `id % 12 + 1` 백필, 신규 유저는 가입(social upsert) 시 저장. `/me`·author dict에는 **추가 필드**로만 노출(기존 응답 무변경).
3. **이슈 댓글**: 기존 `comments`(post_id NOT NULL FK)를 건드리지 않기 위해 신규 `issue_comments` 테이블 사용(필드는 comments 미러). `serializers.comment_dict`는 재사용.
4. **테스트존 OG 이미지**: Pillow 등 이미지 생성 의존성 미도입. 테스트별 정적 브랜드 OG 이미지 1장 + 결과별 동적 `og:title`/`og:description`(예 "나는 직진 하트토끼형! 너는?"). 공유 카드 텍스트로 결과 전달.
5. **피드 목업 썸네일**: 기존 index.tsx가 전 글에 picsum 썸네일 강제 → §2의 3케이스가 보이도록 글별 분기(투표글=썸네일 없음, `id%3==0`=이미지글 썸네일, 그 외=텍스트글). 실제 이미지 업로드 기능 도입 전까지 placeholder.
6. **Git**: 루트(`c:\side_Prj\오늘연애`)에 단일 저장소 초기화. 기존 `app/.git`은 create-expo-app 초기 커밋뿐이라 제거하고 루트로 통합. 단계별 `design-update step N: ...` 커밋.
7. **WebView**: `react-native-webview`(Expo Go 호환 네이티브 모듈) 신규 설치, 테스트존 스크린 1개에만 사용. 이슈 원문/외부 링크 아웃링크는 기존 `expo-web-browser`.
8. **가입 완료 아바타 문구(§1)**: 현재 별도 가입/온보딩 완료 화면이 없음(소셜 upsert 즉시 로그인). 온보딩 화면 신설은 범위 밖 → 문구 노출 보류. 온보딩 도입 시 추가.
9. **말머리 미니뱃지(§2)**: 데이터에 별도 말머리 필드가 없어 category/투표여부에서 파생 — 투표글="투표", counsel="고민", 그 외="썰". 메타줄 카테고리와 구분되도록 코스한 태그로.
10. **테스트존 채점 tiebreak(§6)**: `tests.tiebreak`에 우선순위 코드열("RB,DG,FX,CT,BR,PG") 저장, MD의 "동점 시 우선순위" 줄에서 파싱. 궁합(match/clash)은 결과 유형명의 동물 키워드로 코드 해석.
11. **테스트존 OG(§6)**: 결과별 정적 이미지 미생성(Pillow 미도입). `og:title`="나는 {유형}! 너는?", `og:desc`=캐치프레이즈, `og:image`=결과 아바타 SVG. 실제 카톡 공유 최적화 시 결과별 PNG 도입 여지.
12. **카톡 공유(§6)**: Kakao JS SDK 앱키 미보유 → 공유 버튼은 Web Share API(navigator.share) + 링크복사 폴백. 키 확보 시 Kakao SDK 교체.
13. **앱↔테스트 뱃지 연동(§6)**: 웹은 기본 비로그인. 앱 WebView 진입 시 쿼리 `app_uid=<userId>`를 실어 `/t/.../submit`에서 `TestAttempt.user_id`로 연결 → `/me/test-badge`가 최근 결과 반환. 토큰 대신 uid 사용(민감정보 아님, 재미 뱃지 연동용).
14. **관리자(§5)**: `/admin?token=<ADMIN_TOKEN>` 폼(이슈 등록·테스트 활성화). 세션 로그인 대신 토큰 게이트(운영 시 강한 토큰/역프록시 보호 권장).

---

# 오늘연애 리브랜딩 + IA + PC웹 — 결정 기록

## 사용자 확인
- rename 범위: 저장소 전체 파일내용 구 브랜드명→"오늘연애" (설계문서·목업·입력폴더 포함, 검색 0건). 식별자 slug/scheme=`todaylove`, 패키지=`com.hco.todaylove`.
- GNB: **5탭 홈·커뮤니티·연애이슈·BEST·마이** (HOME_UPDATE 4탭에서 BEST 유지). 커플 자유서술 "오늘의 질문" 탭은 오프-GNB(MY 진입).

## 리브랜딩 자율결정
- **루트 폴더 경로명 `c:\side_Prj\썰전`**은 파일 "내용"이 아니라 파일시스템 경로 → 유지(작업 디렉토리 rename은 위험/범위 밖). 저장소 내용 검색은 0건.
- **로마자 `sseuljeon`** 은 한글 구 브랜드명 리브랜딩 대상 아님. 내부 식별자로 유지: DB명 `sseuljeon`(docker/config), 토큰 저장키 `sseuljeon.jwt`(내부, 유저 무노출; 변경 시 재로그인만 유발), picsum 목업 시드 문자열. (운영 전환 시 DB명은 인프라 결정으로 별도 처리)
- **구 브랜드명의 일반명사 용법**(투표글·게시판 뜻)도 전역 치환으로 "오늘연애"가 됨 — 문서/주석은 브랜드 prefix로 자연스러워 그대로, 유저 노출 문자열 1곳(`daily.py` 질문→글 전환 body)만 "…글로 가져왔어요"로 조사 자연화.
- **EAS projectId 미연결**: `app.json`/`eas.json`에 projectId 없음 → 리브랜딩으로 깨질 링크 없음. 신규 패키지로 `eas init` 필요(콘솔 체크리스트).

## IA/홈 자율결정
- 퀵메뉴 8종 → 기존 4카테고리 매핑: 연애고민→love, 예비부부·결혼준비→marriage, 재테크고민·직장커리어·일상잡담→free, 가족·인간관계→counsel, 전체게시판→(전체), 연애유형테스트→테스트존. (아이콘-라벨은 스펙 그대로, 카테고리만 근사 매핑)
- 인기글 TOP5: 기존 hot_score와 별개로 스펙 가중치(최근24h `조회×1+댓글×5+공감×3`) 신규 `/home/trending`, `ranking` 메모리캐시 10분 재사용.

## 푸시 랜딩(3d) 자율결정
- **`usePushRouting`**(`_layout.tsx`): `data.type` 라우팅 — `best`→`/post/[id]`(서버 `notify-best`가 이미 `{type:"best", post_id}` 발송), `daily*`→`/daily`(서버 `notify-daily`가 `{type:"daily_arrived"}` → prefix 매칭), `issue`→`/issues`. 콜드스타트(`getLastNotificationResponseAsync`)+실행중(`addNotificationResponseReceivedListener`) 모두 처리. 서버 페이로드가 이미 존재하는 타입만 매핑(신규 서버 변경 없음).

## PC 웹(Task 4) 자율결정
- **브레이크포인트 1240px**: `Platform.OS==='web' && width>=1240`(`useIsDesktop`). 미만은 기존 모바일 그대로(모바일 웹 포함). 한 번의 웹 빌드로 반응형 커버.
- **데스크톱 셸**: `<Tabs tabBar={()=>null}>`로 하단 탭바 숨기고 `DesktopShell`(상단 GNB+중앙600+우측레일280)로 감쌈. FAB 미노출. 각 탭 스크린의 자체 헤더는 유지(중앙은 "모바일 구성 그대로" 원칙) — 상단 GNB와 일부 중복이나 로직/스타일 변경 없이 재배치만.
- **테스트존 웹(4-0)**: `react-native-webview`는 웹 런타임 없음(빌드는 통과하나 렌더 불가). 플랫폼 분기 `tests.web.tsx`에서 `<iframe src=/t>`로 대체. 그 외 모듈(secure-store=localStorage 분기済, notifications=guard済, svg/web-browser 웹OK) 하드 블로커 없음 → `expo export --platform web` 성공 확인.
- **웹 배포(4-2)**: 클라이언트 라우트(`/issues/5`·`/post/12`)가 Flask API 경로와 충돌 → **웹앱은 별도 오리진(서브도메인) 권장**. nginx 정적+SPA fallback, API는 절대 URL(`EXPO_PUBLIC_API_BASE_URL`)로 직접 호출(프록시 불요). 동일 오리진 불가피 시 `experiments.baseUrl:"/app"` 서브패스 격리. 상세 `WEB_DEPLOY.md`.
