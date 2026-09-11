import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { createRemoteJWKSet, jwtVerify } from "jose";
import { authConfig, authEnabled } from "./auth.config";

export { authEnabled } from "./auth.config";

// GIS(Google Identity Services) 버튼이 돌려준 ID 토큰을 구글 공개키로 검증한다.
// 리다이렉트 OAuth와 별개 경로지만, 검증 후에는 아래 jwt 콜백의 upsert를 그대로 탄다.
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs")
);

const gisProvider = Credentials({
  id: "google-gis",
  name: "Google (GIS)",
  credentials: { credential: {} },
  async authorize(credentials) {
    const idToken = credentials?.credential;
    if (typeof idToken !== "string" || !idToken) return null;
    try {
      const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
        issuer: ["https://accounts.google.com", "accounts.google.com"],
        audience: process.env.AUTH_GOOGLE_ID,
      });
      if (!payload.email || payload.email_verified !== true) return null;
      return {
        email: payload.email as string,
        name: (payload.name as string | undefined) ?? null,
        image: (payload.picture as string | undefined) ?? null,
      };
    } catch {
      return null; // 서명·aud·만료 불일치 → 로그인 거부
    }
  },
});

// ALLOWED_EMAIL 화이트리스트 - 쉼표 구분, 대소문자 무시. 비어 있으면 전원 허용.
const allowedEmails = (process.env.ALLOWED_EMAIL ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

function isAllowedEmail(email: string | null | undefined): boolean {
  if (allowedEmails.length === 0) return true;
  return !!email && allowedEmails.includes(email.toLowerCase());
}

// 구글 로그인 = 회원가입. 첫 로그인 시 users에 upsert하고 내부 id를 JWT에 심는다.
export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: authEnabled ? [...authConfig.providers, gisProvider] : [],
  callbacks: {
    // 리다이렉트 OAuth·GIS 두 경로 모두 여기를 거친다. 차단 시 /login?error=AccessDenied
    signIn({ user }) {
      return isAllowedEmail(user?.email);
    },
    async jwt({ token, user }) {
      const email = user?.email ?? (token.email as string | undefined);
      if (!token.uid && email) {
        // 동적 import: 이 콜백은 Node 라우트에서만 실행되므로 edge 번들에 db가 딸려가지 않는다
        const { upsertUser } = await import("@/lib/user");
        // 숏링크(/l/{code}) 유입 쿠키 - 첫 가입 어트리뷰션용. 컨텍스트에 따라 못 읽을 수 있어 방어
        let refCode: string | null = null;
        try {
          const { cookies } = await import("next/headers");
          refCode = (await cookies()).get("wid_ref")?.value ?? null;
        } catch {
          refCode = null;
        }
        const { id, isNew } = await upsertUser(
          email,
          (user?.name ?? token.name ?? null) as string | null,
          (user?.image ?? token.picture ?? null) as string | null,
          refCode
        );
        token.uid = id;
        // 신규 가입 시각 - 클라이언트가 GA sign_up 이벤트를 1회 쏘는 근거
        if (isNew) token.signedUpAt = Date.now();
      }
      return token;
    },
    session({ session, token }) {
      const s = session as unknown as { uid?: number; signedUpAt?: number };
      s.uid = token.uid as number | undefined;
      s.signedUpAt = token.signedUpAt as number | undefined;
      return session;
    },
  },
});
