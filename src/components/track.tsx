"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { track, type EventName } from "@/lib/analytics";

type Params = Record<string, string | number | boolean | null | undefined>;

/* 로그인 상태에서 1회성 계정 이벤트를 쏜다.
   - sign_up: 방금 가입한 사용자만(JWT의 signedUpAt 30분 이내), localStorage로 평생 1회 보장
   - login: 브라우저 세션당 1회 (GA 세션과 근사) */
export function SessionEvents({ signedUpAt }: { signedUpAt: number | null }) {
  useEffect(() => {
    try {
      if (
        signedUpAt &&
        Date.now() - signedUpAt < 30 * 60_000 &&
        !localStorage.getItem("wid_ga_signup")
      ) {
        track("sign_up", { method: "google" });
        localStorage.setItem("wid_ga_signup", "1");
      }
      if (!sessionStorage.getItem("wid_ga_login")) {
        track("login", { method: "google" });
        sessionStorage.setItem("wid_ga_login", "1");
      }
    } catch {}
  }, [signedUpAt]);
  return null;
}

/* 감싼 폼(가장 가까운 부모 <form>)이 제출될 때 이벤트를 쏜다.
   서버 액션 폼 안에 <TrackSubmit event="..." /> 한 줄만 넣으면 된다.
   required 검증을 통과한 제출만 submit 이벤트가 발생하므로 저장 성공과 거의 일치한다. */
export function TrackSubmit({ event, params }: { event: EventName; params?: Params }) {
  const ref = useRef<HTMLSpanElement>(null);
  const p = useRef(params);
  p.current = params;
  useEffect(() => {
    const form = ref.current?.closest("form");
    if (!form) return;
    const h = () => track(event, p.current);
    form.addEventListener("submit", h);
    return () => form.removeEventListener("submit", h);
  }, [event]);
  return <span ref={ref} hidden />;
}

/* 감싼 영역이 클릭될 때 이벤트를 쏜다 (레이아웃 영향 없음 - display:contents) */
export function TrackClick({
  event,
  params,
  children,
}: {
  event: EventName;
  params?: Params;
  children: ReactNode;
}) {
  return (
    <span className="contents" onClickCapture={() => track(event, params)}>
      {children}
    </span>
  );
}
