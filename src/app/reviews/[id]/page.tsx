import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq } from "drizzle-orm";
import { db, reviews } from "@/db";
import { requireUserId } from "@/lib/session";
import { updateReview, deleteReview } from "@/lib/actions";
import { fmtDate } from "@/lib/dates";
import { ReviewEditor } from "./review-editor";

export const dynamic = "force-dynamic";

const SCOPE_LABEL = { daily: "일간", weekly: "주간", monthly: "월간" } as const;

export default async function ReviewDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) notFound();

  const uid = await requireUserId();
  const [r] = await db
    .select()
    .from(reviews)
    .where(and(eq(reviews.id, id), eq(reviews.userId, uid)));
  if (!r) notFound();

  return (
    <div className="space-y-6">
      <div className="text-sm">
        <Link href="/reviews" className="text-neutral-400 hover:text-neutral-600">← 계획·회고 목록</Link>
      </div>

      <header>
        <h1 className="text-2xl font-bold">
          {fmtDate(r.date)} <span className="text-lg text-neutral-400">{SCOPE_LABEL[r.scope]}</span>
        </h1>
      </header>

      <ReviewEditor
        planMd={r.planMd ?? ""}
        retroMd={r.retroMd ?? ""}
        updateAction={updateReview.bind(null, r.id)}
        deleteAction={deleteReview.bind(null, r.id)}
      />
    </div>
  );
}
