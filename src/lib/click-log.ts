import { eq } from "drizzle-orm";
import { db, shortLinks, linkClicks } from "@/db";
import { users } from "@/db/schema";

/* 링크 프리뷰 봇 - 슬랙·카톡 등에 링크를 올리면 사람이 누르기 전에
   봇이 먼저 URL을 긁어서 미리보기 카드를 만든다. 그대로 두면 아무도
   안 눌러도 클릭이 찍힌다. 슬랙 채널 세 곳에 올리면 유령 클릭 3개로 시작.

   ⚠️ `kakaotalk-scrap` 만 걸러야 한다. 카톡 인앱 브라우저의 UA에는
   `KAKAOTALK` 이 들어 있는데 그건 진짜 사람이다. */
const PREVIEW_BOT =
  /slackbot|twitterbot|facebookexternalhit|facebot|kakaotalk-scrap|discordbot|telegrambot|linkedinbot|whatsapp|embedly|skypeuripreview|googlebot|bingbot|yeti|daumoa|applebot|petalbot|ahrefsbot|semrushbot/i;

export function isPreviewBot(userAgent: string | null): boolean {
  return PREVIEW_BOT.test(userAgent ?? "");
}

/** 외부 사이트로 나가는 링크인가 (카톡방·인스타 등) */
export function isExternalTarget(targetPath: string): boolean {
  return /^https?:\/\//i.test(targetPath);
}

/** 클릭 1건 기록. 실패해도 리다이렉트를 막지 않는다. */
export async function logClick(linkId: number, req: Request): Promise<void> {
  try {
    await db.insert(linkClicks).values({
      linkId,
      referer: req.headers.get("referer"),
    });
  } catch {
    // 집계 실패는 무시 - 사람은 보내야 한다
  }
}

/** 나가는 링크(`/go/*`)용 숏링크 행을 찾고, 없으면 만든다.
   어드민이 프리셋을 안 눌렀어도 측정이 되게 하려는 것. */
export async function ensureOutboundLink(
  code: string,
  target: string,
  note: string
): Promise<number | null> {
  const [found] = await db.select().from(shortLinks).where(eq(shortLinks.code, code));
  if (found) return found.id;

  // 소유자는 첫 어드민. 어드민이 아직 없으면 기록을 포기한다
  const [owner] = await db
    .select({ id: users.id })
    .from(users)
    .where(eq(users.isAdmin, true))
    .orderBy(users.id)
    .limit(1);
  if (!owner) return null;

  try {
    const [created] = await db
      .insert(shortLinks)
      .values({ userId: owner.id, code, targetPath: target, note })
      .returning({ id: shortLinks.id });
    return created?.id ?? null;
  } catch {
    // 동시 요청이 먼저 만들었을 수 있다 - 다시 찾아본다
    const [again] = await db.select().from(shortLinks).where(eq(shortLinks.code, code));
    return again?.id ?? null;
  }
}
