# WID GA4 이벤트 택소노미 v1

> 2026-09-12 · 코드 정본은 `src/lib/analytics.ts`의 `EventName` 유니온.
> 규칙: 이름은 `대상_동사` snake_case · 상황은 파라미터로 · 개인정보(제목·본문·금액·이메일)는 절대 보내지 않는다.

## 계층 구조

| 티어 | 목적 | 이벤트 |
|---|---|---|
| 0 자동수집 | 방문·세션 (GA4 기본, 설정 불요) | `page_view` `session_start` `first_visit` |
| 1 계정 | 전환 깔때기의 끝 | ⭐`sign_up` · `login` |
| 2 실행 | 활성 사용자(재방문 가치) 판별 | `task_create` `task_complete` `routine_check` `routine_uncheck` `ai_tasks_extract` |
| 3 설계 | 온보딩 깊이(구조를 만들었는가) | `area_create` `goal_create` `project_create` `routine_create` |
| 4 기록 | 습관화 신호 | `note_create` `review_create` `money_txn_add` |
| 5 마케팅 | 랜딩 전환 계단 | `cta_click` |

## 이벤트 정의

| 이벤트 | 발생 시점 | 파라미터 | 빈도 |
|---|---|---|---|
| ⭐ `sign_up` | 구글 첫 로그인으로 users 행이 **새로 생성**된 직후 (JWT `signedUpAt` 30분 이내 + localStorage 가드) | `method: "google"` | 평생 1회 |
| `login` | 로그인 상태로 앱 진입 | `method` | 브라우저 세션당 1회 |
| `cta_click` | 랜딩 얼리버드 CTA 클릭 | `from: hero \| header \| final` | 매번 |
| `task_create` | 할 일 저장 폼 제출 | `from: routines_quick \| tasks` | 매번 |
| `task_complete` | 할 일 완료 체크 (완료→미완 되돌림은 제외) | `from: routines \| tasks` | 매번 |
| `routine_check` | 루틴 오늘 체크 | `from: routines`, `streak`(체크 후 연속일) | 매번 |
| `routine_uncheck` | 오늘 체크 취소 (오입력 비율 파악용) | `from` | 매번 |
| `ai_tasks_extract` | 이미지→할 일 AI 추출 결과를 실제 등록했을 때 | `count`(등록 개수) | 매번 |
| `area_create` | 최종 목표(영역) 추가 | - | 매번 |
| `goal_create` | 세부 목표 추가 | - | 매번 |
| `project_create` | 프로젝트 추가 | - | 매번 |
| `routine_create` | 루틴 추가 | - | 매번 |
| `note_create` | 노트 추가 | - | 매번 |
| `review_create` | 계획·회고 새 문서 생성 | `scope`(일간/주간 등) | 매번 |
| `money_txn_add` | 가계부 지출/수입 기록 | - (금액·카테고리 미전송) | 매번 |

⭐ = GA 주요 이벤트(key event)로 지정. `GA_KEY_EVENT_NAME` env 기본값 `sign_up` → 어드민 GA 대시보드의 "핵심 이벤트" 열이 이걸 집계한다.

## 구현 방식

- 전부 **클라이언트 gtag** 이벤트 - GA 세션·UTM 어트리뷰션에 자동으로 묶여 "채널별 가입/행동" 교차 분석이 된다 (서버 Measurement Protocol은 세션 연결이 안 돼서 안 씀).
- 서버 액션 폼: 폼 안에 `<TrackSubmit event params>` 한 줄 (`src/components/track.tsx`). required 검증 통과한 제출만 잡히므로 저장 성공과 근사.
- 클라이언트 컴포넌트: 액션 성공 후 `track()` 직접 호출 (예: `image-task-capture.tsx`).
- `sign_up` 판별: `upsertUser`가 `xmax=0`으로 INSERT 여부 반환 → NextAuth JWT `signedUpAt` → `<SessionEvents>`가 1회 발사.

## 나중에 (v2 후보)

- `milestone_add` / `kpi_add` (설계 세분화) · `goal_metric_update` (수치 갱신) · `guide_view` (설명서 조회)
- 스트림 지표: routine_check의 `streak` 분포로 리텐션 코호트
- GA 잠재고객: "설계 완료(area+goal+project 각 1개 이상)" 세그먼트

## 운영 메모

- 2026-09-12 `sign_up` 1건은 연동 검증용 테스트 이벤트(`method: setup_test`).
- GA 주요 이벤트 별표: 관리 → 이벤트 허브 표에 `sign_up`이 나타나면(수집 후 최대 24h) 별표 클릭. 어드민 대시보드 집계는 별표와 무관하게 동작.
