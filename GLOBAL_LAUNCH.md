# 오늘연애 → TodayLoves 글로벌 확장 — 배포 런북

한국(ko) + 영어권(en) 언어권 분리 커뮤니티 + K-Story 번역 파이프라인의 운영 배포 가이드.
코드는 전부 반영됨. 아래는 **운영 서버·스토어에서 한 번씩 해야 할 일**.

## 0. 사전 (필수)
- [ ] **DB 백업** 후 `cd server && flask db upgrade` (마이그레이션 `c1d2global` — users/posts/콘텐츠에 lang, kstory_candidates). 기존 데이터는 전부 `lang='ko'` 자동 백필.
- [ ] `.env` 추가:
  - `ANTHROPIC_API_KEY=` (**매일 운세 AI 생성 + K-Story 번역**. 없으면 운세는 폴백 풀 문구로 자동 대체, 번역 배치는 실패-알림만)
  - `FORTUNE_MODEL=claude-sonnet-5` (운세 본문 모델. 품질 우선이면 `claude-opus-5`, 월 비용 약 2배)
  - `KSTORY_MODEL=claude-sonnet-5` (기본. 비용 절감 시 `claude-haiku-4-5`)
  - `KSTORY_WINDOW_H=72` `KSTORY_MIN_LIKES=20` `KSTORY_MIN_COMMENTS=10` `KSTORY_DAILY_CAP=3` (임계치·페이스 조절)
  - `TELEGRAM_BOT_TOKEN=` `TELEGRAM_CHAT_ID=` (배치 실패 알림. 미설정 시 no-op)
- [ ] 운영 계정 시드: `flask seed-operator`(데일리스레드) + `flask seed-kstory-operator`(K-Story 발행자)
- [ ] 최초 운세: `flask fortune-generate --date <오늘> --overwrite` / `--lang en` 각각 + 내일분

## 1. 크론 (crontab -u todaylove) — 기존 3종 + 운세(ko/en) + K-Story
`TZ=Asia/Seoul` 을 crontab 최상단에 두어 KST 기준 실행.
```cron
TZ=Asia/Seoul
VENV=/srv/todaylove/server/.venv/bin
APP=cd /srv/todaylove/server &&
LOG=>> /var/log/todaylove

# 기존 (오늘연애 v1)
*/5 * * * *  $APP $VENV/flask recompute-hot        $LOG/hot.log 2>&1
0 9 * * *    $APP $VENV/flask notify-daily          $LOG/daily.log 2>&1
5 9 * * *    $APP $VENV/flask notify-best           $LOG/best.log 2>&1

# 자정 운세 — ko + en 둘 다 (생성 23:40 / 검증 23:55 / 발행 코호트)
40 23 * * *  $APP $VENV/flask fortune-generate --lang ko $LOG/fortune.log 2>&1
41 23 * * *  $APP $VENV/flask fortune-generate --lang en $LOG/fortune.log 2>&1
55 23 * * *  $APP $VENV/flask fortune-verify   --lang ko $LOG/fortune.log 2>&1
56 23 * * *  $APP $VENV/flask fortune-verify   --lang en $LOG/fortune.log 2>&1
0 0 * * *    $APP $VENV/flask fortune-notify --cohort 00 $LOG/fortune.log 2>&1
0 0 * * *    $APP $VENV/flask fortune-thread           $LOG/fortune.log 2>&1
0 7 * * *    $APP $VENV/flask fortune-notify --cohort 07 $LOG/fortune.log 2>&1
0 9 * * *    $APP $VENV/flask fortune-notify --cohort 09 $LOG/fortune.log 2>&1

# K-Story 파이프라인 (한국 인기글 → 영어 피드)
30 3 * * *   $APP $VENV/flask kstory-select    $LOG/kstory.log 2>&1   # 후보 선정 일 1회
0 */6 * * *  $APP $VENV/flask kstory-translate $LOG/kstory.log 2>&1   # 번역 6시간마다
0 10 * * *   $APP $VENV/flask kstory-publish   $LOG/kstory.log 2>&1   # 발행 일 1회(cap 상한)
15 4 * * *   $APP $VENV/flask kstory-sync      $LOG/kstory.log 2>&1   # 원본삭제 정리 안전망
```
> `fortune-notify` 는 수신자 `user.lang` 로 세그먼트·티저 언어를 자동 선택(코호트만 지정).
> `kstory-translate` 는 `--limit N`(기본 20)으로 회당 처리량 조절 가능.

## 2. K-Story 운영 흐름 (관리자)
1. `kstory-select` → 동의(terms_v2)한 작성자의 인기 ko 글이 `candidate` 로 쌓임.
2. `kstory-translate` → Claude 가 익명화+각색 번역 → `translated`.
3. **관리자 검수**: `https://<서버>/admin/kstory?token=<ADMIN_TOKEN>` — 원문/번역 대조, `translator_note` 확인 후 **승인/반려/직접수정+승인**.
4. `kstory-publish` → `approved` 를 하루 `KSTORY_DAILY_CAP` 건까지 영어 피드에 `post_type=kstory` 로 발행.
- 원본 글 삭제 시 연결 K-Story 글 자동 비공개(+`kstory-sync` 안전망).

## 3. 앱 빌드 (EAS)
- [ ] `app.json` versionCode/version 증가 → `eas build -p android --profile production`(AAB).
- [ ] 신규 네이티브/플러그인 반영: `expo-localization`, config plugin `withLocalizedAppName`(prebuild 시 Android `values-ko/strings.xml` + iOS `ko.lproj` 생성 → 표시명 ko=오늘연애 / en=TodayLoves).
- [ ] i18n: 기기 로케일로 초기 언어, 로그인 후 `user.lang` 동기화. 언어 전환은 마이 > 언어.

## 4. Play Console (프로덕션 업데이트)
- [ ] 프로덕션 트랙에 AAB 제출.
- [ ] **스토어 등록정보 en-US 추가**: 앱명 `TodayLoves`, 아래 영어 카피(초안):
  - Short: "Daily love horoscope + an honest dating community."
  - Full: "Your daily love horoscope at midnight, tarot & compatibility, and a candid community to share dating stories — plus K-Story, real Korean dating tales translated for you."
- [ ] **배포 국가 추가**: 미국 + 필리핀(권장). 기존 한국 유지.
- [ ] **데이터 보안 섹션**: 수집 항목 변동 없음(언어 설정은 기기 로케일 기반, 신규 개인정보 수집 없음) — 재확인만.
- [ ] 앱 콘텐츠 > **UGC 안내**: 신고/차단/커뮤니티 가이드라인(`/guidelines`, `/guidelines/en`) URL 제출. 게시 전 자동검수는 미적용(신고+차단+가이드라인 기반 사후 모더레이션).

## 5. 검증 체크 (배포 후)
- [ ] en 기기(또는 로케일 en) 신규 가입 → UI 영어, 피드에 en 글만, 운세 영어(별자리).
- [ ] ko 유저 → 기존과 동일(피드·운세·표시명 모두 무변경).
- [ ] 마이 > 언어 전환 → 피드/운세 언어권 즉시 전환.
- [ ] 개정 약관 소프트 모달 1회 노출, '나중에' 눌러도 앱 사용 정상.
- [ ] K-Story 파이프라인 1건 end-to-end(select→translate→admin 승인→publish) + 영어 피드 K-Story 뱃지·필터.

## 참고 — 미구현/범위 밖
- **게시 전 자동검수(Claude 필터)**: 사용자 결정으로 미구현.
- **앱 i18n 커버리지**: 프레임워크 + 핵심 표면(탭·커뮤니티·PostCard·마이·인증·신고/차단·약관·운세 데이터) 완료. 나머지 화면(이슈상세·테스트존·커플·글쓰기·캘린더·운세탭 UI 크롬·카테고리 라벨·상대시간)은 ko 리터럴 폴백 → 후속 점진 치환(신규 키만 추가하면 됨). KO 유저는 전부 무변경.
