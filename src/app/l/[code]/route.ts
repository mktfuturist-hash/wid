import { NextResponse, type NextRequest } from "next/server";
import { eq } from "drizzle-orm";
import { db, shortLinks } from "@/db";
import { isPreviewBot, isExternalTarget, logClick } from "@/lib/click-log";

/* 숏링크 리다이렉트: /l/{code} → 타겟 + UTM 파라미터.
   `/l/*` 은 **들어오는** 링크다 (슬랙·단톡방·인스타에 뿌리는 것).
   나가는 링크는 `/go/*` 가 맡는다. */
export const dynamic = "force-dynamic";
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  const [link] = await db.select().from(shortLinks).where(eq(shortLinks.code, code));
  if (!link) {
    return NextResponse.redirect(new URL("/landing", req.url));
  }

  // 링크 프리뷰 봇은 사람이 아니다 - 세지 않는다
  if (!isPreviewBot(req.headers.get("user-agent"))) {
    await logClick(link.id, req);
  }

  const external = isExternalTarget(link.targetPath);
  const url = external ? new URL(link.targetPath) : new URL(link.targetPath, req.url);

  // UTM 은 내 사이트로 보낼 때만 붙인다. 남의 사이트에 붙여봐야 읽지 않는다
  if (!external) {
    if (link.utmSource) url.searchParams.set("utm_source", link.utmSource);
    if (link.utmMedium) url.searchParams.set("utm_medium", link.utmMedium);
    if (link.utmCampaign) url.searchParams.set("utm_campaign", link.utmCampaign);
    if (link.utmContent) url.searchParams.set("utm_content", link.utmContent);
  }

  const res = NextResponse.redirect(url);

  /* 어트리뷰션 쿠키는 **들어오는** 링크에서만 심는다.
     나가는 링크에서도 심으면, 슬랙을 타고 들어온 사람이 카톡방 버튼을
     누르는 순간 유입 출처가 덮여서 "어디서 왔는지"를 잃는다. */
  if (!external) {
    res.cookies.set("wid_ref", link.code, {
      maxAge: 60 * 60 * 24 * 30, // 30일 - 이 안에 가입하면 이 링크의 전환으로 집계
      path: "/",
      sameSite: "lax",
    });
  }
  return res;
}
