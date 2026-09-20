/* 인앱 브라우저(카톡·네이버앱·인스타 등) 감지와 외부 브라우저 탈출.
   구글이 임베디드 웹뷰의 OAuth를 차단(403 disallowed_useragent)하므로,
   로그인 동선은 반드시 기본 브라우저로 빼내야 한다. 클라이언트 전용. */

export type InAppKind = "kakao" | "android" | "ios" | null;

/** 인앱 브라우저면 종류를, 일반 브라우저면 null을 돌려준다 */
export function detectInApp(): InAppKind {
  if (typeof navigator === "undefined") return null;
  const ua = navigator.userAgent;
  if (/KAKAOTALK/i.test(ua)) return "kakao";
  const inapp =
    /Instagram|Barcelona|FBAN|FBAV|FB_IAB|Line\/|NAVER\(inApp|DaumApps|everytimeApp|trill|; wv\)/i.test(ua);
  if (!inapp) return null;
  return /Android/i.test(ua) ? "android" : "ios";
}

/** 현재 페이지를 기본 브라우저로 여는 시도. 성공 여부와 무관하게 즉시 반환한다 */
export function openInDefaultBrowser(kind: InAppKind, url?: string) {
  if (typeof window === "undefined" || !kind) return;
  const target = url ?? window.location.href;
  if (kind === "kakao") {
    // 카카오톡 공식 스킴 - 기본 브라우저로 강제 오픈
    window.location.href = "kakaotalk://web/openExternal?url=" + encodeURIComponent(target);
    return;
  }
  if (kind === "android") {
    // 안드로이드 인앱(네이버앱 등): intent 스킴으로 기본 브라우저 호출
    const u = new URL(target);
    window.location.href =
      `intent://${u.host}${u.pathname}${u.search}` +
      "#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end";
    return;
  }
  // iOS 인앱: 공식 탈출 스킴이 없다. 최신 iOS에서 동작하는 x-safari를 시도해 본다 (실패 시 무해)
  window.location.href = "x-safari-https://" + target.replace(/^https?:\/\//, "");
}
