# 테스트 가이드

## 서버 (pytest, Docker MariaDB)

```bash
cd server
docker compose up -d                      # MariaDB (3307)
# 테스트DB 1회 생성 (conftest 가 root 로 자동 시도하지만 수동도 가능)
docker exec sseuljeon-db mariadb -uroot -prootpw -e \
  "CREATE DATABASE IF NOT EXISTS sseuljeon_test CHARACTER SET utf8mb4; GRANT ALL ON sseuljeon_test.* TO 'sseuljeon'@'%';"
.venv/Scripts/python.exe -m pip install -r requirements-dev.txt
.venv/Scripts/python.exe -m pytest -q
```

- 격리: 세션 1회 `create_all` → 매 테스트 전 전 테이블 `DELETE` + 캐시 클리어([tests/conftest.py](server/tests/conftest.py)).
- 커버리지: 인증·글/투표·댓글·BEST/랭킹·신고/차단·오늘의질문·커플·캘린더(레트로핏) + AI 제안·푸시 발송(TDD).
- 현재 **50 passed**.

## 앱 (jest-expo + React Native Testing Library)

```bash
cd app
npm test
```

- 설정: [jest.config.js](app/jest.config.js)(preset `jest-expo`, `@/`→`src/`), [jest.setup.js](app/jest.setup.js)(네이티브 모듈 목).
- **로직/계약 테스트(활성, 10 passed)**: API 클라이언트(`src/api/client.test.ts`), 토큰 저장소(`src/auth/tokenStorage.test.ts`),
  위젯 데이터 직렬화(`src/widget/widgetData.test.ts`), 푸시 등록(`src/push/registerPush.test.ts`).
- **렌더 기반 컴포넌트/화면 테스트(일시 skip)**: `StatusChip`·`PostCard`·`FilterRow`·`login`.
  - 사유: **RN 0.85 + React 19.2 환경에서 `react-test-renderer` 가 빈 트리를 반환**(render 결과에 쿼리 미바인딩).
    테스트 코드가 아니라 스택 비호환 문제. 렌더러 호환이 복구되면 각 파일의 `describe.skip` → `describe` 로 되돌리면 즉시 동작.
  - 그동안 컴포넌트 동작은 `tsc` + Metro 번들 + 수동 QA로 보장.

## CI (GitHub Actions)
[.github/workflows/ci.yml](.github/workflows/ci.yml): `server` 잡(MariaDB service → pytest), `app` 잡(tsc + jest).
