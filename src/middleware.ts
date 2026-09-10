import NextAuth from "next-auth";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { authConfig, authEnabled } from "@/auth.config";

// edge-safe 인스턴스 (DB 콜백 없음 — JWT 존재 여부만 확인)
const { auth } = NextAuth(authConfig);

// 비로그인에게도 열리는 경로 (랜딩·사용 설명서·로그인)
const PUBLIC_PATHS = ["/", "/landing", "/guide", "/privacy", "/login"];

export async function middleware(req: NextRequest) {
  if (!authEnabled) return NextResponse.next();
  const { pathname } = req.nextUrl;
  if (
    PUBLIC_PATHS.includes(pathname) ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/l/") // UTM 숏링크 리다이렉트 — 비로그인도 통과
  ) {
    return NextResponse.next();
  }
  const session = await auth();
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.nextUrl.origin));
  }
  return NextResponse.next();
}

export const config = {
  // 정적 자산(이미지 등)은 인증 검사에서 제외 — 비로그인 랜딩에서도 로고가 보여야 한다
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.webmanifest|icons|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)",
  ],
};
