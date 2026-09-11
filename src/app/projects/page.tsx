import Link from "next/link";
import { and, asc, eq, inArray, sql } from "drizzle-orm";
import { db, projects, tasks, areas, goals } from "@/db";
import { createProject } from "@/lib/actions";
import { requireUserId } from "@/lib/session";
import { ddayLabel, fmtDate, todayStr } from "@/lib/dates";
import { AreaChip, Card, DdayBadge, Empty, PILLARS, ProgressBar, SectionTitle } from "@/components/ui";
import { NewProjectForm } from "./new-project-form";

export const dynamic = "force-dynamic";

const STATUS_LABEL: Record<string, string> = {
  planned: "예정",
  active: "진행 중",
  done: "완료",
  hold: "보류",
};

export default async function ProjectsPage() {
  const uid = await requireUserId();
  const [prjs, areaList, goalList] = await Promise.all([
    db.select().from(projects).where(eq(projects.userId, uid)).orderBy(asc(projects.startDate), asc(projects.id)),
    db.select().from(areas).where(eq(areas.userId, uid)),
    db.select().from(goals).where(eq(goals.userId, uid)),
  ]);
  const taskStats: { projectId: number | null; total: number; done: number }[] =
    prjs.length
      ? await db
          .select({
            projectId: tasks.projectId,
            total: sql<number>`count(*)::int`,
            done: sql<number>`count(*) filter (where ${tasks.done})::int`,
          })
          .from(tasks)
          .where(inArray(tasks.projectId, prjs.map((p) => p.id)))
          .groupBy(tasks.projectId)
      : [];

  const statOf = (id: number) =>
    taskStats.find((t) => t.projectId === id) ?? { total: 0, done: 0 };

  // 아직 안 한 할 일 - 카드 안에 "다음에 하게 될 항목"으로 노출
  const undoneTasks = prjs.length
    ? await db
        .select()
        .from(tasks)
        .where(and(inArray(tasks.projectId, prjs.map((p) => p.id)), eq(tasks.done, false)))
        .orderBy(asc(tasks.dueDate), asc(tasks.id))
    : [];
  const undoneOf = (id: number) => undoneTasks.filter((t) => t.projectId === id);

  // ── 타임라인 범위: 프로젝트 기간 전체를 감싸는 구간 ──
  const dated = prjs.filter((p) => p.startDate && p.endDate && p.status !== "done");
  const minD = dated.length ? dated.reduce((m, p) => (p.startDate! < m ? p.startDate! : m), dated[0].startDate!) : null;
  const maxD = dated.length ? dated.reduce((m, p) => (p.endDate! > m ? p.endDate! : m), dated[0].endDate!) : null;
  const span =
    minD && maxD
      ? Math.max(1, (new Date(maxD).getTime() - new Date(minD).getTime()) / 86400000)
      : 1;
  const pct = (d: string) =>
    minD ? ((new Date(d).getTime() - new Date(minD).getTime()) / 86400000 / span) * 100 : 0;
  const today = todayStr();

  const grouped = (["active", "planned", "hold", "done"] as const).map((s) => ({
    status: s,
    list: prjs.filter((p) => p.status === s),
  }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">📁 프로젝트</h1>
        <p className="mt-1 text-sm text-neutral-500">
          무엇을 만들어서 가는가 - 목표를 향한 실행 단위에 할 일을 붙여 계획하세요.
        </p>
      </header>

      <Card>
        <NewProjectForm
          action={createProject}
          areas={areaList.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name, icon: a.icon }))}
          goals={goalList.filter((g) => g.status === "active").map((g) => ({ id: g.id, title: g.title, areaId: g.areaId }))}
        />
      </Card>

      {/* 타임라인 */}
      {dated.length > 0 && minD && maxD && (
        <Card>
          <SectionTitle>타임라인 ({fmtDate(minD)} ~ {fmtDate(maxD)})</SectionTitle>
          <div className="relative space-y-2 py-1">
            {/* 오늘 표시선 */}
            {today >= minD && today <= maxD && (
              <div
                className="absolute inset-y-0 z-10 w-px bg-red-400"
                style={{ left: `${pct(today)}%` }}
                title="오늘"
              />
            )}
            {dated.map((p) => {
              const st = statOf(p.id);
              const rate = st.total ? st.done / st.total : 0;
              const area = areaList.find((a) => a.id === p.areaId);
              return (
                <div key={p.id} className="relative h-8">
                  <Link
                    href={`/projects/${p.id}`}
                    className="absolute flex h-full items-center overflow-hidden rounded-lg bg-neutral-200 hover:ring-2 hover:ring-neutral-400"
                    style={{
                      left: `${pct(p.startDate!)}%`,
                      width: `${Math.max(4, pct(p.endDate!) - pct(p.startDate!))}%`,
                    }}
                  >
                    <div
                      className={`absolute inset-y-0 left-0 ${area ? PILLARS[area.pillar].bar : "bg-neutral-800"}`}
                      style={{ width: `${rate * 100}%` }}
                    />
                    <span className="relative z-10 truncate px-2.5 text-xs font-medium text-white mix-blend-difference">
                      {area?.icon} {p.title} {st.total > 0 && `(${st.done}/${st.total})`}
                    </span>
                  </Link>
                </div>
              );
            })}
          </div>
        </Card>
      )}

      {grouped.map(({ status, list }) =>
        list.length === 0 ? null : (
          <section key={status}>
            <SectionTitle>{STATUS_LABEL[status]} ({list.length})</SectionTitle>
            <div className="space-y-3">
              {list.map((p) => {
                const st = statOf(p.id);
                const area = areaList.find((a) => a.id === p.areaId);
                const goal = goalList.find((g) => g.id === p.goalId);
                return (
                  <Link key={p.id} href={`/projects/${p.id}`} className="block">
                    <Card pillar={area?.pillar} className="transition hover:shadow-md">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex min-w-0 items-center gap-2">
                          {area && <AreaChip icon={area.icon} name={area.name} pillar={area.pillar} />}
                          <span className={`truncate font-semibold ${status === "done" ? "text-neutral-400 line-through" : ""}`}>
                            {p.title}
                          </span>
                          {goal && (
                            <span className="hidden truncate rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500 sm:inline">
                              🎯 {goal.title}
                            </span>
                          )}
                        </div>
                        <div className="flex shrink-0 items-center gap-2 text-xs text-neutral-500">
                          {p.startDate && p.endDate && (
                            <span>{fmtDate(p.startDate)} ~ {fmtDate(p.endDate)}</span>
                          )}
                          {status !== "done" && <DdayBadge label={ddayLabel(p.endDate)} />}
                        </div>
                      </div>
                      {st.total > 0 && (
                        <div className="mt-2.5">
                          <ProgressBar value={st.done / st.total} pillar={area?.pillar ?? "work"} />
                          <div className="mt-1 text-xs text-neutral-400">
                            할 일 {st.done}/{st.total} 완료 · {st.total - st.done}개 남음
                          </div>
                        </div>
                      )}
                      {/* 다음에 하게 될 할 일 미리보기 (완료 전 프로젝트만) */}
                      {status !== "done" && (() => {
                        const next = undoneOf(p.id);
                        if (next.length === 0) return null;
                        const shown = next.slice(0, 4);
                        return (
                          <ul className="mt-2.5 space-y-1 border-t border-neutral-100 pt-2.5">
                            {shown.map((t) => (
                              <li key={t.id} className="flex items-center gap-2 text-xs">
                                <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded border border-neutral-300 bg-white" />
                                <span className="flex-1 truncate text-neutral-600">{t.title}</span>
                                {t.dueDate && (
                                  <span className="tabular-nums text-neutral-400">{fmtDate(t.dueDate)}</span>
                                )}
                              </li>
                            ))}
                            {next.length > shown.length && (
                              <li className="text-xs text-neutral-400">… 외 {next.length - shown.length}개</li>
                            )}
                          </ul>
                        );
                      })()}
                    </Card>
                  </Link>
                );
              })}
            </div>
          </section>
        )
      )}

      {prjs.length === 0 && <Empty>프로젝트가 없습니다. 위에서 추가해 보세요.</Empty>}
    </div>
  );
}
