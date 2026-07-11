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
6. **Git**: 루트(`c:\side_Prj\썰전`)에 단일 저장소 초기화. 기존 `app/.git`은 create-expo-app 초기 커밋뿐이라 제거하고 루트로 통합. 단계별 `design-update step N: ...` 커밋.
7. **WebView**: `react-native-webview`(Expo Go 호환 네이티브 모듈) 신규 설치, 테스트존 스크린 1개에만 사용. 이슈 원문/외부 링크 아웃링크는 기존 `expo-web-browser`.
8. **가입 완료 아바타 문구(§1)**: 현재 별도 가입/온보딩 완료 화면이 없음(소셜 upsert 즉시 로그인). 온보딩 화면 신설은 범위 밖 → 문구 노출 보류. 온보딩 도입 시 추가.
