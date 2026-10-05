"use client";

import { useOptimistic, useTransition, type ReactNode } from "react";
import { track, type EventName } from "@/lib/analytics";

type Ui = {
  className: string;
  label: ReactNode;
  title?: string;
  ariaLabel?: string;
  /** 이 상태로 "전환될 때" 쏠 GA 이벤트 (doneUi.event = 체크할 때, undoneUi.event = 해제할 때) */
  event?: EventName;
  params?: Record<string, string | number | boolean>;
};

/* 낙관적 체크 토글 - 누르는 즉시 화면이 바뀌고 서버 저장은 뒤에서 진행된다.
   서버 왕복(미국 리전 시절 2~3초)을 기다리지 않게 하는 게 목적.
   각 상태의 겉모습(Ui)은 서버 컴포넌트가 계산해 내려준다 (스트릭 숫자 등).
   저장이 끝나 revalidate된 데이터가 오면 done prop이 갱신되며 낙관 상태가 자동 수렴한다. */
export function OptimisticToggle({
  done,
  doneUi,
  undoneUi,
  checkAction,
  uncheckAction,
}: {
  done: boolean;
  doneUi: Ui;
  undoneUi: Ui;
  checkAction: () => Promise<void>;
  uncheckAction: () => Promise<void>;
}) {
  const [opt, setOpt] = useOptimistic(done);
  const [, start] = useTransition();
  const ui = opt ? doneUi : undoneUi;
  return (
    <button
      type="button"
      className={ui.className}
      title={ui.title}
      aria-label={ui.ariaLabel}
      onClick={() => {
        const next = !opt;
        const target = next ? doneUi : undoneUi;
        if (target.event) track(target.event, target.params);
        start(async () => {
          setOpt(next);
          await (next ? checkAction() : uncheckAction());
        });
      }}
    >
      {ui.label}
    </button>
  );
}
