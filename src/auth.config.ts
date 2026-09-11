import type { NextAuthConfig } from "next-auth";
import Google from "next-auth/providers/google";

/* 프로덕션에서는 절대 바이패스하지 않는다.

   예전에는 `AUTH_GOOGLE_ID && AUTH_GOOGLE_SECRET` 유무만 봤다. 그래서 배포 환경에
   환경변수를 빠뜨리거나 이름을 한 글자 틀리면, 앱이 **에러 없이 조용히 로컬 모드**로
   돌았다. 그 상태에서는 `requireUserId()` 가 개발용 사용자를 내주고 `isAdmin()` 이
   모두에게 true 를 반환해서 - 어드민 화면의 가입자 명단과 삭제 기능이 전부 공개된다.

   그래서 판단 기준을 뒤집었다. 프로덕션이면 인증은 무조건 켜진 것으로 본다.
   자격 증명이 없으면 아무도 로그인하지 못할 뿐(= 닫히는 쪽으로 실패),
   아무나 어드민이 되지는 않는다. */
const isProd =
  process.env.NODE_ENV === "production" || !!process.env.VERCEL_ENV;

const hasGoogleCreds = !!(
  process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
);

export const authEnabled = isProd || hasGoogleCreds;

if (isProd && !hasGoogleCreds) {
  console.error(
    "[auth] 프로덕션인데 AUTH_GOOGLE_ID/SECRET 이 없습니다 - 로그인이 동작하지 않습니다. Vercel 환경변수를 확인하세요."
  );
}

/* 세션 서명 키. 예전에는 `?? "dev-only-secret"` 으로 흘렸는데, 이 값은 저장소에
   공개돼 있어서 프로덕션에서 쓰이면 **누구나 원하는 uid 로 세션을 위조**할 수 있다
   (어드민 계정 포함). 프로덕션에서 키가 없으면 부팅마다 임의 값을 쓴다 —
   로그인이 자주 풀리는 대신 위조는 불가능하다. */
function resolveSecret(): string {
  const fromEnv = process.env.AUTH_SECRET;
  if (fromEnv) return fromEnv;
  if (!isProd) return "dev-only-secret";
  console.error(
    "[auth] 프로덕션인데 AUTH_SECRET 이 없습니다 - 부팅마다 임의 키를 씁니다. 로그인이 계속 풀린다면 이 값을 설정하세요."
  );
  // 이 파일은 Edge(미들웨어)에서도 로드된다 - node:crypto 말고 Web Crypto를 쓴다
  const bytes = new Uint8Array(32);
  globalThis.crypto.getRandomValues(bytes);
  return btoa(String.fromCharCode(...bytes));
}

// Edge(미들웨어)에서도 안전한 설정만 - DB를 만지는 콜백은 auth.ts에서 추가한다.
export const authConfig: NextAuthConfig = {
  secret: resolveSecret(),
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" }, // 커스텀 로그인 화면 (로고+키카피+GIS)
  providers: hasGoogleCreds ? [Google] : [],
};
