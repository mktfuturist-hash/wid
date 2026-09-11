import { notFound } from "next/navigation";
import Link from "next/link";
import { and, eq, asc } from "drizzle-orm";
import { db, goals, milestones, areas, moneyAccounts, projects, tasks } from "@/db";
import { inArray } from "drizzle-orm";
import { requireUserId } from "@/lib/session";
import {
  updateGoal, deleteGoal, addMilestone, toggleMilestone, updateMilestone, deleteMilestone,
  setGoalStatus, updateGoalCurrent, toggleTask,
} from "@/lib/actions";
import { MilestoneRow } from "./milestone-row";
import { NumberInput } from "@/components/number-input";
import { GoalSettings } from "./goal-settings";
import { ConfirmButton } from "@/components/confirm-button";
import { getGoalsWithProgress } from "@/lib/progress";
import { ddayLabel, fmtDate } from "@/lib/dates";
import { AreaChip, Card, DdayBadge, Empty, FieldLabel, ProgressBar, SectionTitle, SmartDate } from "@/components/ui";

const METRIC_LABEL: Record<string, string> = {
  milestone: "중간 목표 체크",
  manual: "수치 직접 입력",
  routine_count: "루틴 실행 횟수",
  task_rate: "프로젝트 할일 완료율",
  money: "계좌 잔액",
};

export const dynamic = "force-dynamic";

export default async function GoalDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) notFound();

  const uid = await requireUserId();
  const [g] = await db
    .select()
    .from(goals)
    .where(and(eq(goals.id, id), eq(goals.userId, uid)));
  if (!g) notFound();

  const [ms, areaList, accts, withProgress, linkedProjects] = await Promise.all([
    db.select().from(milestones).where(eq(milestones.goalId, id)).orderBy(asc(milestones.dueDate), asc(milestones.id)),
    db.select().from(areas).where(eq(areas.userId, uid)).orderBy(asc(areas.sort), asc(areas.id)),
    db.select().from(moneyAccounts).where(eq(moneyAccounts.userId, uid)),
    getGoalsWithProgress(uid),
    db.select().from(projects).where(and(eq(projects.goalId, id), eq(projects.userId, uid))).orderBy(asc(projects.startDate), asc(projects.id)),
  ]);
  // 연결된 프로젝트들의 할 일 (현황판용)
  const projectTasks = linkedProjects.length
    ? await db
        .select()
        .from(tasks)
        .where(inArray(tasks.projectId, linkedProjects.map((p) => p.id)))
        .orderBy(asc(tasks.dueDate), asc(tasks.id))
    : [];
  const gp = withProgress.find((x) => x.id === id);
  const area = areaList.find((a) => a.id === g.areaId);
  const next = gp?.nextMilestone ?? null;

  return (
    <div className="space-y-8">
      <div className="text-sm">
        <Link href="/goals" className="text-neutral-400 hover:text-neutral-600">← 세부 목표 목록</Link>
      </div>

      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-2.5">
            {area && <AreaChip icon={area.icon} name={area.name} pillar={area.pillar} />}
            <h1 className="truncate text-2xl font-bold">{g.title}</h1>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <DdayBadge label={ddayLabel(g.dueDate, g.status === "done")} />
            {g.status !== "done" ? (
              <form action={setGoalStatus.bind(null, g.id, "done")}>
                <button className="btn-ghost text-xs">달성 처리</button>
              </form>
            ) : (
              <form action={setGoalStatus.bind(null, g.id, "active")}>
                <button className="btn-ghost text-xs">다시 진행</button>
              </form>
            )}
          </div>
        </div>
        {/* 진척률 바 위: 측정 방식과 현재값·목표값을 명확히 표기 */}
        <div className="flex items-center justify-between text-sm">
          <span className="text-neutral-500">{METRIC_LABEL[g.metricType]}</span>
          <span className="font-medium tabular-nums text-neutral-700">
            {g.metricType === "milestone" && `중간 목표 ${gp?.milestoneDone ?? 0}/${gp?.milestoneTotal ?? 0} 달성`}
            {g.metricType === "task_rate" && `할 일 ${gp?.currentValue ?? 0}/${gp?.targetValue ?? 0} 완료`}
            {(g.metricType === "manual" || g.metricType === "routine_count" || g.metricType === "money") &&
              `${g.metricType === "manual" && g.metricStart != null ? `시작 ${g.metricStart.toLocaleString()}${g.metricUnit ?? ""} · ` : ""}현재 ${gp?.currentValue?.toLocaleString() ?? "—"}${g.metricUnit ?? ""} · 목표 ${gp?.targetValue?.toLocaleString() ?? "—"}${g.metricUnit ?? ""}`}
          </span>
        </div>
        <ProgressBar value={gp?.progress ?? null} pillar={area?.pillar ?? "life"} />
        {/* 수치 직접 입력 목표는 여기서 현재값을 수시로 기록한다 */}
        {g.metricType === "manual" && g.status !== "done" && (
          <form action={updateGoalCurrent.bind(null, g.id)} className="flex items-end gap-2">
            <label>
              <FieldLabel>현재값 업데이트</FieldLabel>
              <NumberInput name="metricCurrent" defaultValue={g.metricCurrent} className="w-36" />
            </label>
            {g.metricUnit && <span className="pb-2.5 text-sm text-neutral-500">{g.metricUnit}</span>}
            <button type="submit">기록</button>
          </form>
        )}
        {next && (
          <p className="text-sm text-neutral-500">
            🚩 다음 중간 목표: <b>{next.title}</b>
            {next.dueDate && ` — ${fmtDate(next.dueDate)} (${ddayLabel(next.dueDate)})`}
          </p>
        )}
      </header>

      {/* 연결된 프로젝트 현황판 — 프로젝트명 + 하위 할 일을 한눈에 */}
      {linkedProjects.length > 0 && (
        <Card>
          <SectionTitle>📁 연결된 프로젝트 ({linkedProjects.length})</SectionTitle>
          <div className="space-y-4">
            {linkedProjects.map((p) => {
              const pts = projectTasks.filter((t) => t.projectId === p.id);
              const doneCnt = pts.filter((t) => t.done).length;
              return (
                <div key={p.id} className="rounded-lg border border-neutral-100 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <Link href={`/projects/${p.id}`} className="min-w-0 truncate font-medium hover:underline">
                      📁 {p.title}
                    </Link>
                    <span className="shrink-0 text-xs text-neutral-400">
                      {p.startDate && p.endDate && (
                        <><SmartDate date={p.startDate} />~<SmartDate date={p.endDate} /> · </>
                      )}
                      할 일 {doneCnt}/{pts.length}
                    </span>
                  </div>
                  {pts.length > 0 && (
                    <>
                      <div className="mt-2">
                        <ProgressBar value={pts.length ? doneCnt / pts.length : null} pillar={area?.pillar ?? "work"} />
                      </div>
                      <ul className="mt-2 space-y-1">
                        {pts.map((t) => (
                          <li key={t.id} className="flex items-center gap-2 text-sm">
                            <form action={toggleTask.bind(null, t.id, !t.done)}>
                              <button
                                className={`unstyled flex h-4 w-4 cursor-pointer items-center justify-center rounded border text-[10px] ${
                                  t.done
                                    ? "border-neutral-900 bg-neutral-900 text-white"
                                    : "border-neutral-300 bg-white text-transparent hover:border-neutral-500"
                                }`}
                                aria-label="완료 토글"
                              >
                                ✓
                              </button>
                            </form>
                            <span className={`min-w-0 flex-1 truncate ${t.done ? "text-neutral-400 line-through" : "text-neutral-700"}`}>
                              {t.title}
                            </span>
                            {t.dueDate && (
                              <span className="shrink-0 text-xs tabular-nums text-neutral-400"><SmartDate date={t.dueDate} /></span>
                            )}
                          </li>
                        ))}
                      </ul>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </Card>
      )}

      <Card>
        <SectionTitle>중간 목표 ({gp?.milestoneDone ?? 0}/{gp?.milestoneTotal ?? 0})</SectionTitle>
        {/* 중간 목표 체크 방식이 아니면 진척률과 무관한 선택 항목임을 안내 */}
        {g.metricType !== "milestone" && (
          <p className="-mt-1 mb-3 text-xs text-neutral-400">
            이 목표의 진척률은 &lsquo;{METRIC_LABEL[g.metricType]}&rsquo;으로 계산됩니다 — 중간 목표은 필수가 아니라 선택적인 중간 체크포인트예요.
          </p>
        )}
        {ms.length === 0 ? (
          <Empty>목표까지의 중간 체크포인트를 추가해 보세요</Empty>
        ) : (
          <ul className="space-y-1.5">
            {ms.map((m) => (
              <MilestoneRow
                key={m.id}
                milestone={{ id: m.id, title: m.title, dueDate: m.dueDate, done: m.done }}
                toggleAction={toggleMilestone.bind(null, m.id, !m.done)}
                updateAction={updateMilestone.bind(null, m.id)}
                deleteAction={deleteMilestone.bind(null, m.id)}
              />
            ))}
          </ul>
        )}
        <form action={addMilestone.bind(null, g.id)} className="mt-3 flex items-end gap-2 border-t border-neutral-100 pt-3">
          <label className="flex-1">
            <FieldLabel>중간 목표</FieldLabel>
            <input name="title" placeholder="새 중간 목표" required className="w-full" />
          </label>
          <label>
            <FieldLabel>기한</FieldLabel>
            <input type="date" name="dueDate" />
          </label>
          <button type="submit">추가</button>
        </form>
      </Card>

      <GoalSettings
        goal={{
          id: g.id,
          title: g.title,
          areaId: g.areaId,
          dueDate: g.dueDate,
          status: g.status,
          description: g.description,
          metricType: g.metricType,
          metricCurrent: g.metricCurrent,
          metricTarget: g.metricTarget,
          metricStart: g.metricStart,
          metricUnit: g.metricUnit,
          moneyAccountId: g.moneyAccountId,
        }}
        areas={areaList.filter((a) => !a.archived).map((a) => ({ id: a.id, name: a.name, icon: a.icon }))}
        accounts={accts.map((a) => ({ id: a.id, name: a.name }))}
        updateAction={updateGoal.bind(null, g.id)}
      />

      <form action={deleteGoal.bind(null, g.id)}>
        <ConfirmButton
          message={`'${g.title}' 목표를 삭제할까요? 중간 목표도 함께 삭제됩니다.`}
          className="cursor-pointer text-xs text-neutral-400 hover:text-red-500"
        >
          이 목표 삭제
        </ConfirmButton>
      </form>
    </div>
  );
}
