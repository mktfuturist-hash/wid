import { eq } from "drizzle-orm";
import { db } from "@/db";
import { earlybird } from "@/db/schema";
import { todayStr, dday } from "@/lib/dates";

export type Earlybird = {
  deadline: string;
  capacity: number;
  priceAnchor: string;
  priceNow: string;
  forceClosed: boolean;
};

/* 표가 비어 있을 때 쓰는 값. 예전에 landing.tsx 에 박혀 있던 그대로다.
   DB가 잠깐 안 되더라도 랜딩은 떠야 하므로 상수를 남겨 둔다. */
export const EARLYBIRD_FALLBACK: Earlybird = {
  deadline: "2026-09-18",
  capacity: 30,
  priceAnchor: "월 4,900원",
  priceNow: "얼리버드 기간 한정 0원",
  forceClosed: false,
};

/** 현재 설정. 행이 없으면 만들어 두고, 실패해도 기본값으로 랜딩을 띄운다. */
export async function getEarlybird(): Promise<Earlybird> {
  try {
    const [row] = await db.select().from(earlybird).where(eq(earlybird.id, 1));
    if (row) {
      return {
        deadline: row.deadline,
        capacity: row.capacity,
        priceAnchor: row.priceAnchor,
        priceNow: row.priceNow,
        forceClosed: row.forceClosed,
      };
    }
    await db.insert(earlybird).values({ id: 1, ...EARLYBIRD_FALLBACK });
    return EARLYBIRD_FALLBACK;
  } catch (e) {
    /* 설정을 못 읽는다고 랜딩이 죽으면 안 된다 — 기본값으로 띄운다.
       다만 조용히 넘어가면 "어드민에서 바꿨는데 랜딩이 그대로"인 상황을
       영영 모른다. 그래서 반드시 로그를 남긴다. */
    console.error("[earlybird] 설정을 못 읽어 기본값으로 띄웁니다:", e);
    return EARLYBIRD_FALLBACK;
  }
}

/** 지금 모집이 닫혀 있나 — 강제 마감이거나, 마감일이 지났거나 */
export function isClosed(eb: Earlybird): boolean {
  if (eb.forceClosed) return true;
  if (process.env.EARLYBIRD_CLOSED === "1") return true;
  return todayStr() > eb.deadline;
}

/** "9/18" 처럼 짧게 — 랜딩 배지용 */
export function shortDate(ymd: string): string {
  const [, m, d] = ymd.split("-");
  return `${Number(m)}/${Number(d)}`;
}

/** D-3 / D-day. 이미 지났으면 null */
export function ddayLabel(ymd: string): string | null {
  const n = dday(ymd);
  if (n < 0) return null;
  return n === 0 ? "D-day" : `D-${n}`;
}
