import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, shortLinks, linkClicks } from "@/db";

/* 숏링크 리다이렉트: /l/{code} → 타겟 경로 + UTM 파라미터.
   클릭을 기록하고, 첫 가입 어트리뷰션용 쿠키(wid_ref)를 심는다. */
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const [link] = await db.select().from(shortLinks).where(eq(shortLinks.code, code));
  if (!link) {
    return NextResponse.redirect(new URL("/landing", req.url));
  }

  // 클릭 로그 (익명 — 시각·리퍼러만). 로그 실패가 리다이렉트를 막지 않게 한다
  try {
    await db.insert(linkClicks).values({
      linkId: link.id,
      referer: req.headers.get("referer"),
    });
  } catch {
    // 집계 실패는 무시
  }

  const url = new URL(link.targetPath, req.url);
  if (link.utmSource) url.searchParams.set("utm_source", link.utmSource);
  if (link.utmMedium) url.searchParams.set("utm_medium", link.utmMedium);
  if (link.utmCampaign) url.searchParams.set("utm_campaign", link.utmCampaign);
  if (link.utmContent) url.searchParams.set("utm_content", link.utmContent);

  const res = NextResponse.redirect(url);
  res.cookies.set("wid_ref", link.code, {
    maxAge: 60 * 60 * 24 * 30, // 30일 — 이 안에 가입하면 이 링크의 전환으로 집계
    path: "/",
    sameSite: "lax",
  });
  return res;
}
