/* GA4 행동 이벤트 - 클라이언트 전용.
   이벤트 택소노미 v1 (이름 = 대상_동사 snake_case, 상황은 파라미터로):
   - 계정: sign_up(가입, 평생 1회·주요 이벤트) · login(브라우저 세션당 1회)
   - 실행: task_create · task_complete · routine_check · routine_uncheck · ai_tasks_extract
   - 설계: area_create · goal_create · project_create · routine_create
   - 기록: note_create · review_create · money_txn_add
   - 마케팅: cta_click(from)
   개인정보·본문·금액은 절대 보내지 않는다. 파라미터는 출처(from)·개수(count)·종류(scope) 수준만. */

export type EventName =
  | "sign_up"
  | "login"
  | "cta_click"
  | "task_create"
  | "task_complete"
  | "routine_check"
  | "routine_uncheck"
  | "routine_create"
  | "goal_create"
  | "area_create"
  | "project_create"
  | "note_create"
  | "review_create"
  | "money_txn_add"
  | "ai_tasks_extract";

type Params = Record<string, string | number | boolean | null | undefined>;

declare global {
  interface Window {
    dataLayer?: unknown[];
    gtag?: (...args: unknown[]) => void;
  }
}

export function track(event: EventName, params: Params = {}) {
  if (typeof window === "undefined") return;
  try {
    if (typeof window.gtag === "function") {
      window.gtag("event", event, params);
    } else {
      // gtag.js가 아직 안 왔으면 같은 규약으로 큐잉 - Arguments 객체만 명령으로 인식하므로 rest 금지
      window.dataLayer = window.dataLayer ?? [];
      // eslint-disable-next-line prefer-rest-params
      window.gtag = function () { window.dataLayer!.push(arguments); };
      window.gtag("event", event, params);
    }
    if (process.env.NODE_ENV !== "production") console.debug("[track]", event, params);
  } catch {
    /* 측정 실패가 앱 동작에 영향을 주면 안 된다 */
  }
}
