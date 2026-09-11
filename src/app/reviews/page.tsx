import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, reviews } from "@/db";
import { requireUserId } from "@/lib/session";
import { createReview } from "@/lib/actions";
import { fmtDate } from "@/lib/dates";
import { Card, Empty, SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

const SCOPE_META = {
  daily: { label: "일간", icon: "☀️" },
  weekly: { label: "주간", icon: "🗓️" },
  monthly: { label: "월간", icon: "🌙" },
} as const;

export default async function ReviewsPage() {
  const uid = await requireUserId();
  const list = await db
    .select()
    .from(reviews)
    .where(eq(reviews.userId, uid))
    .orderBy(desc(reviews.date), desc(reviews.id));

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">🪞 계획·회고</h1>
        <p className="mt-1 text-sm text-neutral-500">
          왼쪽엔 계획, 오른쪽엔 회고 - 양식이 자동으로 채워집니다.
        </p>
      </header>

      <Card>
        <SectionTitle>새로 작성</SectionTitle>
        <div className="flex gap-2">
          {(Object.keys(SCOPE_META) as (keyof typeof SCOPE_META)[]).map((scope) => (
            <form key={scope} action={createReview.bind(null, scope)}>
              <button className="btn">
                {SCOPE_META[scope].icon} 오늘의 {SCOPE_META[scope].label}
              </button>
            </form>
          ))}
        </div>
        <p className="mt-2 text-xs text-neutral-400">
          이미 작성한 날이면 해당 페이지로 이동합니다.
        </p>
      </Card>

      {list.length === 0 ? (
        <Empty>아직 기록이 없습니다. 오늘의 일간 계획부터 시작해 보세요.</Empty>
      ) : (
        <div className="space-y-2">
          {list.map((r) => (
            <Link key={r.id} href={`/reviews/${r.id}`} className="block">
              <Card className="flex items-center justify-between py-3 transition hover:border-neutral-400">
                <span className="font-medium">
                  {SCOPE_META[r.scope].icon} {fmtDate(r.date)}{" "}
                  <span className="text-sm text-neutral-400">{SCOPE_META[r.scope].label}</span>
                </span>
                <span className="text-xs text-neutral-400">
                  {r.retroMd && r.retroMd.replace(/[#\-\s]/g, "").length > 20 ? "회고 완료" : "작성 중"}
                </span>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
