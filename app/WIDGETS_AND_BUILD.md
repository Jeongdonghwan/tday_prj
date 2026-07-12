# 위젯 · 빌드 가이드 (7~8단계)

이 두 단계는 **Expo Go 로는 검증 불가**하다. 네이티브 코드/권한이 필요해
`expo prebuild` + **EAS Build**(dev client) 환경에서만 동작한다. 아래는 착수 메모.

## 8단계 — 푸시 (구현됨, 빌드 필요)
- 클라: [src/push/registerPush.ts](src/push/registerPush.ts) — 로그인 직후 Expo push token 발급 → `PATCH /me { push_token }`.
  - Expo Go(SDK 53+)는 원격 푸시 토큰을 발급하지 않아 **조용히 noop**. dev/prod 빌드에서 동작.
- 서버: `users.push_token` 저장됨. 발송은 Expo Push API(`https://exp.host/--/api/v2/push/send`)로 서버에서 호출(후속).
  - 트리거(스펙 §7): 오늘의질문 도착 / 커플 답변 완료 / 내 글 베스트 등재.
- `app.json` plugins 에 `expo-notifications` 추가 권장(아이콘/색). EAS 프로젝트 생성 시 `expo-notifications` projectId 자동 연결.

## 7단계 — 홈 위젯
**데이터 계층은 구현·테스트 완료**: [src/widget/widgetData.ts](src/widget/widgetData.ts) 가
`/couple/dday` + `/daily/today` 를 위젯 표시 텍스트(`{ ddayText, questionText, hasToday }`)로 직렬화한다
(예: "준호님과 327일째", "오늘 질문 도착"). 단위테스트 `widgetData.test.ts` 통과.

**네이티브 위젯(빌드 필요, Expo Go 미지원)** — Expo Go 흐름을 깨지 않으려 네이티브 라이브러리는 **아직 설치하지 않음**. dev build 전환 시:

- iOS: `expo-widgets`(Expo UI) — D-day / 오늘의질문 위젯. App Group `group.com.sseuljeon.shared` 를 앱·위젯 타깃 양쪽에 설정.
- Android: `react-native-android-widget`(Expo config plugin).
- 데이터 공유: 앱이 `couple/dday`·`daily/today` 결과를 App Group(또는 SharedPreferences)에 써두고 위젯이 읽음. 갱신은 **일 단위 + 오늘의질문 발행 시**(초 단위 카운트다운 OS 정책상 불가).
- 적용 순서: `app.json` 에 App Group/위젯 플러그인 → `npx expo prebuild` → `eas build`.

## 빌드 (EAS)
[eas.json](eas.json) 프로파일:
- `development` — dev client(`developmentClient: true`), 내부 배포. 위젯/푸시 실기기 테스트용.
- `preview` — 내부 배포 APK. 테스터 12명 비공개 테스트(스펙 §10)용.
- `production` — 스토어 제출용. `EXPO_PUBLIC_API_BASE_URL` 을 실제 HTTPS 도메인으로 교체할 것.

```bash
npm i -g eas-cli
eas login
eas build:configure
eas build --profile development --platform android   # dev client
eas build --profile preview --platform android       # 테스터 APK
```

## 출시 전 교체 항목
- `eas.json` 의 `EXPO_PUBLIC_API_BASE_URL` → 실제 API 도메인(HTTPS, Let's Encrypt — 스펙 §3/§8).
- `app.json` bundleIdentifier/package(`com.sseuljeon.app` 임시) 확정, 앱 이름(현재 "오늘연애" 가칭).
- 개인정보처리방침 URL, 아이콘/스플래시, 스토어 스크린샷(스펙 §10).
