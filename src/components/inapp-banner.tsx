"use client";

import { useState, useSyncExternalStore } from "react";
import { detectInApp, openInDefaultBrowser } from "@/lib/inapp";

/* 인앱 브라우저(카톡·네이버앱 등)로 들어온 방문자에게 상단 배너로 탈출구를 준다.
   일반 브라우저에서는 아무것도 그리지 않는다. 랜딩 등 공개 페이지 상단에 얹는다. */
export function InAppBanner() {
  const kind = useSyncExternalStore(
    () => () => {},
    detectInApp,
    () => null
  );
  const [copied, setCopied] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  if (!kind || dismissed) return null;

  const open = () => {
    openInDefaultBrowser(kind);
    // iOS 등 스킴이 안 먹는 환경 대비 - 링크 복사를 백업으로
    if (kind === "ios") copy();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  return (
    <div className="full-bleed sticky top-0 z-[60] border-b border-amber-200 bg-amber-50 px-4 py-2">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-1 text-sm text-amber-900">
        <span className="min-w-0 flex-1">
          앱 안 브라우저에서는 구글 로그인이 막혀요.{" "}
          <b>{kind === "ios" ? "Safari로 열어주세요" : "기본 브라우저로 열어주세요"}</b>
        </span>
        <span className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={open}
            className="cursor-pointer rounded-lg bg-amber-600 px-3 py-1 text-xs font-bold text-white hover:bg-amber-700"
          >
            {kind === "kakao" ? "외부 브라우저로 열기" : kind === "android" ? "브라우저로 열기" : "Safari로 열기"}
          </button>
          <button
            type="button"
            onClick={copy}
            className="cursor-pointer rounded-lg border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-100"
          >
            {copied ? "복사됨 ✓" : "링크 복사"}
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            aria-label="닫기"
            className="cursor-pointer px-1 text-amber-400 hover:text-amber-700"
          >
            ✕
          </button>
        </span>
      </div>
    </div>
  );
}
