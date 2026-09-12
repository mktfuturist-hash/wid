"use client";

/* eslint-disable @next/next/no-img-element */
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import Script from "next/script";
import { signIn } from "next-auth/react";

/* ── 인앱 브라우저 감지 ─────────────────────────────────────
   구글은 임베디드 웹뷰의 OAuth를 차단한다(403 disallowed_useragent).
   얼리버드 동선이 카카오 오픈챗이라 카톡 인앱 유입이 많다 →
   카톡은 공식 스킴(kakaotalk://web/openExternal)으로 기본 브라우저를 강제 오픈,
   그 외 인앱(인스타·라인·네이버앱 등)은 안내 + 링크 복사로 우회한다. */
type Browser = "ok" | "kakao" | "inapp";

function detectBrowser(): Browser {
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return "kakao";
  if (/Instagram|FBAN|FBAV|FB_IAB|Line\/|NAVER\(inapp|DaumApps|everytimeApp|; wv\)/i.test(ua))
    return "inapp";
  return "ok";
}

/* GIS 전역 타입 (필요한 부분만) */
declare global {
  interface Window {
    google?: {
      accounts: {
        id: {
          initialize: (cfg: {
            client_id: string;
            callback: (res: { credential: string }) => void;
            ux_mode?: "popup" | "redirect";
            use_fedcm_for_prompt?: boolean;
          }) => void;
          renderButton: (
            el: HTMLElement,
            opts: {
              type?: "standard" | "icon";
              theme?: "outline" | "filled_blue" | "filled_black";
              size?: "large" | "medium" | "small";
              text?: "signin_with" | "continue_with" | "signup_with";
              shape?: "rectangular" | "pill" | "circle" | "square";
              logo_alignment?: "left" | "center";
              width?: number;
              locale?: string;
            }
          ) => void;
        };
      };
    };
  }
}

export function LoginCard({
  authEnabled,
  googleClientId,
  loginError,
}: {
  authEnabled: boolean;
  googleClientId: string | null;
  loginError?: string | null;
}) {
  // SSR에서는 "ok"로 그리고, 클라이언트에서 UA로 확정 (hydration-safe)
  const browser = useSyncExternalStore(
    () => () => {},
    detectBrowser,
    () => "ok" as Browser
  );
  const [copied, setCopied] = useState(false);
  const [gisFailed, setGisFailed] = useState(false);
  const [busy, setBusy] = useState(false);
  const btnRef = useRef<HTMLDivElement>(null);
  const gisReady = useRef(false);

  useEffect(() => {
    if (browser === "kakao") {
      // 카톡 공식 스킴으로 외부 브라우저 자동 오픈 (실패 시 아래 안내 UI가 남는다)
      window.location.href =
        "kakaotalk://web/openExternal?url=" + encodeURIComponent(window.location.href);
    }
  }, [browser]);

  /** GIS 스크립트 로드 완료 → 버튼 렌더 (구글 세션 있으면 계정 개인화 표시) */
  const initGis = useCallback(() => {
    if (gisReady.current || !googleClientId || !btnRef.current || !window.google) return;
    try {
      window.google.accounts.id.initialize({
        client_id: googleClientId,
        callback: async (res) => {
          setBusy(true);
          // 검증은 서버(google-gis 프로바이더)에서 - 성공 시 홈으로
          await signIn("google-gis", { credential: res.credential, callbackUrl: "/" });
          setBusy(false);
        },
        use_fedcm_for_prompt: false,
      });
      window.google.accounts.id.renderButton(btnRef.current, {
        type: "standard",
        theme: "outline",
        size: "large",
        shape: "pill",
        text: "continue_with",
        logo_alignment: "left",
        width: 300,
        locale: "ko",
      });
      gisReady.current = true;
    } catch {
      setGisFailed(true);
    }
  }, [googleClientId]);

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* 클립보드 미지원 웹뷰 - 주소창 안내로 충분 */
    }
  };

  const showGis = authEnabled && !!googleClientId && browser === "ok";

  return (
    <div className="full-bleed -mt-6 flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-brand-mist via-white to-brand-mist/40 px-4">
      {showGis && (
        <Script
          src="https://accounts.google.com/gsi/client"
          strategy="afterInteractive"
          onReady={initGis}
          onError={() => setGisFailed(true)}
        />
      )}

      <div className="w-full max-w-sm space-y-7 rounded-3xl border border-brand-mist bg-white p-8 text-center shadow-xl shadow-brand-deep/10">
        {/* 로고 */}
        <div className="space-y-3">
          <img
            src="/icons/icon-192.png"
            alt="WID"
            className="mx-auto h-16 w-16 rounded-2xl shadow-md"
          />
          <p className="text-2xl font-extrabold tracking-tight text-navy">WID</p>
        </div>

        {/* 키카피 */}
        <div className="space-y-1.5">
          <p className="text-lg font-extrabold leading-snug text-navy">
            오늘 한 일이, 더 현명한 나를.
          </p>
          <p className="text-sm text-neutral-500">구글 계정으로 로그인해 주세요!</p>
        </div>

        {/* 로그인 실패 안내 */}
        {loginError && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm leading-relaxed text-red-600">
            {loginError === "AccessDenied"
              ? "이 서비스는 현재 허용된 계정만 이용할 수 있어요. 이용을 원하시면 운영자에게 문의해 주세요."
              : "로그인에 실패했어요. 잠시 후 다시 시도해 주세요."}
          </p>
        )}

        {/* 로그인 수단 */}
        {browser === "kakao" ? (
          <div className="space-y-3 rounded-2xl bg-brand-mist/60 p-4 text-left text-sm leading-relaxed text-neutral-700">
            <p className="font-bold text-navy">카카오톡 안에서는 구글 로그인이 막혀 있어요</p>
            <p>기본 브라우저로 자동 이동 중이에요. 안 열리면 아래 버튼을 눌러 주세요.</p>
            <a
              href={"kakaotalk://web/openExternal?url=" + encodeURIComponent(typeof window !== "undefined" ? window.location.href : "")}
              className="block rounded-xl bg-brand px-4 py-2.5 text-center font-bold text-white"
            >
              외부 브라우저로 열기
            </a>
            <button onClick={copyLink} className="w-full rounded-xl border border-brand-mist bg-white px-4 py-2.5 font-semibold text-brand-deep">
              {copied ? "복사됐어요 ✓" : "링크 복사하기"}
            </button>
            <p className="text-xs text-neutral-400">
              또는 우측 하단 메뉴(⋯) → <b>다른 브라우저로 열기</b>
            </p>
          </div>
        ) : browser === "inapp" ? (
          <div className="space-y-3 rounded-2xl bg-brand-mist/60 p-4 text-left text-sm leading-relaxed text-neutral-700">
            <p className="font-bold text-navy">앱 내 브라우저에서는 구글 로그인이 막혀 있어요</p>
            <p>
              링크를 복사해 <b>Chrome·Safari</b> 등 기본 브라우저에서 열어 주세요.
            </p>
            <button onClick={copyLink} className="w-full rounded-xl bg-brand px-4 py-2.5 font-bold text-white">
              {copied ? "복사됐어요 ✓" : "링크 복사하기"}
            </button>
          </div>
        ) : !authEnabled ? (
          <div className="space-y-3">
            <p className="rounded-xl bg-neutral-100 px-4 py-3 text-sm text-neutral-500">
              로컬 모드 - 로그인 없이 사용 중이에요
            </p>
            <Link href="/" className="block rounded-xl bg-brand px-4 py-2.5 font-bold text-white">
              홈으로 가기
            </Link>
          </div>
        ) : (
          <div className="space-y-3">
            {/* GIS 버튼 (구글 세션 있으면 "○○ 계정 사용"으로 개인화됨) */}
            <div ref={btnRef} className="flex min-h-11 items-center justify-center" />
            {busy && <p className="text-xs text-neutral-400">로그인 중…</p>}
            {/* GIS 미로드·차단 대비 표준 리다이렉트 경로 */}
            <button
              onClick={() => signIn("google", { callbackUrl: "/" })}
              className={`w-full rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                gisFailed
                  ? "bg-brand font-bold text-white hover:bg-[#0086d6]"
                  : "text-neutral-400 underline-offset-2 hover:text-brand-deep hover:underline"
              }`}
            >
              {gisFailed ? "Google로 로그인" : "버튼이 안 보이면 여기를 눌러 로그인"}
            </button>
          </div>
        )}

        <div className="space-y-1.5 text-left text-xs leading-relaxed text-neutral-400">
          <p>
            구글로 로그인하면{" "}
            <Link href="/terms" className="underline hover:text-neutral-600">이용약관</Link>과 아래
            개인정보 수집·이용에 동의한 것으로 봅니다.
          </p>
          <ul className="list-disc pl-4">
            <li>항목: 이메일 주소, 이름, 프로필 사진 (구글 계정에서 제공)</li>
            <li>목적: 회원 식별 및 로그인, 사용자별 데이터 분리</li>
            <li>보유 기간: 회원 탈퇴(삭제 요청) 시까지</li>
          </ul>
          <p>
            동의를 거부할 수 있으며, 거부 시 로그인이 필요한 기능을 이용할 수
            없습니다.{" "}
            <Link href="/privacy" className="underline hover:text-neutral-600">
              개인정보처리방침 전문 보기
            </Link>
          </p>
        </div>
      </div>

      <Link href="/landing" className="mt-6 text-sm text-brand-deep underline-offset-2 hover:underline">
        ← WID 소개 보기
      </Link>
    </div>
  );
}
