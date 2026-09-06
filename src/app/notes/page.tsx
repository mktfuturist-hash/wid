import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db, notes, areas, goals, projects } from "@/db";
import { requireUserId } from "@/lib/session";
import { createNote } from "@/lib/actions";
import { fmtDate } from "@/lib/dates";
import { Card, Empty, SectionTitle } from "@/components/ui";
import { toKstDate } from "@/lib/routine-stats";

export const dynamic = "force-dynamic";

/* 카드 미리보기용 — 마크다운 기호를 걷어내고 순수 텍스트만 */
function previewText(md: string): string {
  return md
    .replace(/^#{1,6}\s*/gm, "")
    .replace(/^[-*>]\s+/gm, "")
    .replace(/[*_`]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

const TYPE_META = {
  note: { label: "노트", icon: "📝" },
  file: { label: "파일", icon: "📎" },
  link: { label: "링크", icon: "🔗" },
  reference: { label: "레퍼런스", icon: "📚" },
} as const;

export default async function NotesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const typeFilter = typeof sp.type === "string" ? sp.type : "";
  const statusFilter = typeof sp.status === "string" ? sp.status : "active";
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  const uid = await requireUserId();
  const [all, areaList, goalList, prjList] = await Promise.all([
    db.select().from(notes).where(eq(notes.userId, uid)).orderBy(desc(notes.createdAt)),
    db.select().from(areas).where(eq(areas.userId, uid)),
    db.select().from(goals).where(eq(goals.userId, uid)),
    db.select().from(projects).where(eq(projects.userId, uid)),
  ]);

  const list = all.filter(
    (n) =>
      (statusFilter === "all" || n.status === statusFilter) &&
      (!typeFilter || n.type === typeFilter) &&
      (!q || n.title.includes(q) || (n.bodyMd ?? "").includes(q))
  );

  const filterLink = (params: Record<string, string>) => {
    const u = new URLSearchParams({ status: statusFilter, type: typeFilter, q, ...params });
    [...u.entries()].forEach(([k, v]) => !v && u.delete(k));
    return `/notes?${u}`;
  };

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">📝 노트</h1>
        <p className="mt-1 text-sm text-neutral-500">
          배운 것·아이디어·자료를 영역/목표/프로젝트에 연결해 쌓아두세요.
        </p>
      </header>

      <Card>
        <SectionTitle>새 노트</SectionTitle>
        <form action={createNote} className="flex flex-wrap items-end gap-2">
          <input name="title" placeholder="노트 제목" required className="min-w-52 flex-1" />
          <select name="type" defaultValue="note">
            {Object.entries(TYPE_META).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
          <select name="importance" defaultValue="1" title="중요도">
            <option value="1">중요도 1</option>
            <option value="2">중요도 2</option>
            <option value="3">중요도 3</option>
          </select>
          <select name="areaId" defaultValue="">
            <option value="">영역 없음</option>
            {areaList.filter((a) => !a.archived).map((a) => (
              <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
            ))}
          </select>
          <button type="submit">추가</button>
        </form>
      </Card>

      {/* 필터 */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex gap-1.5">
          <Link href={filterLink({ type: "" })} className={`rounded-full px-3 py-1.5 text-sm ${!typeFilter ? "bg-neutral-900 text-white" : "bg-white text-neutral-500 hover:bg-neutral-100"}`}>
            전체
          </Link>
          {Object.entries(TYPE_META).map(([k, v]) => (
            <Link key={k} href={filterLink({ type: k })} className={`rounded-full px-3 py-1.5 text-sm ${typeFilter === k ? "bg-neutral-900 text-white" : "bg-white text-neutral-500 hover:bg-neutral-100"}`}>
              {v.icon} {v.label}
            </Link>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <Link href={filterLink({ status: statusFilter === "archived" ? "active" : "archived" })} className="text-xs text-neutral-400 underline hover:text-neutral-600">
            {statusFilter === "archived" ? "활성 보기" : "보관함"}
          </Link>
          <form action="/notes" className="flex gap-1">
            <input type="hidden" name="type" value={typeFilter} />
            <input type="hidden" name="status" value={statusFilter} />
            <input name="q" defaultValue={q} placeholder="검색" className="w-36" />
          </form>
        </div>
      </div>

      {list.length === 0 ? (
        <Empty>노트가 없습니다</Empty>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((n) => {
            const area = areaList.find((a) => a.id === n.areaId);
            const goal = goalList.find((g) => g.id === n.goalId);
            const prj = prjList.find((p) => p.id === n.projectId);
            return (
              <Link key={n.id} href={`/notes/${n.id}`} className="block">
                <Card className="h-full transition hover:border-neutral-400">
                  <div className="flex items-start justify-between gap-2">
                    {/* 긴 URL 제목도 카드 안에서 줄바꿈되도록 break-all + 2줄 제한 */}
                    <span className="min-w-0 flex-1 break-all font-semibold line-clamp-2">
                      {TYPE_META[n.type].icon} {n.title}
                    </span>
                    <span className="shrink-0 text-xs text-amber-500">{"★".repeat(n.importance)}</span>
                  </div>
                  {n.bodyMd && (
                    <p className="mt-1.5 line-clamp-2 break-all text-xs text-neutral-400">{previewText(n.bodyMd)}</p>
                  )}
                  <div className="mt-2 flex flex-wrap gap-1 text-xs text-neutral-400">
                    {area && <span className="rounded bg-neutral-100 px-1.5 py-0.5">{area.icon} {area.name}</span>}
                    {goal && <span className="rounded bg-neutral-100 px-1.5 py-0.5">🎯 {goal.title}</span>}
                    {prj && <span className="rounded bg-neutral-100 px-1.5 py-0.5">📁 {prj.title}</span>}
                    <span className="ml-auto">{fmtDate(toKstDate(n.createdAt))}</span>
                  </div>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
