import {
  db,
  goals,
  milestones,
  projects,
  tasks,
  routines,
  routineLogs,
  moneyAccounts,
} from "@/db";
import { eq, inArray, sql } from "drizzle-orm";

export type Goal = typeof goals.$inferSelect;
export type Milestone = typeof milestones.$inferSelect;

export type GoalWithProgress = Goal & {
  /** 0~1, 계산 불가 시 null */
  progress: number | null;
  /** 미완료 중 기한이 현재와 가장 가까운 마일스톤 (갓생 OS '다음 마일스톤') */
  nextMilestone: Milestone | null;
  milestoneDone: number;
  milestoneTotal: number;
  /** 측정 방식별 현재값 (manual=직접 입력값, routine_count=실행 횟수, money=계좌 잔액 …) */
  currentValue: number | null;
  /** 측정 방식별 목표값 (milestone·task_rate는 전체 개수) */
  targetValue: number | null;
};

export async function getGoalsWithProgress(uid: number): Promise<GoalWithProgress[]> {
  const gs: Goal[] = await db.select().from(goals).where(eq(goals.userId, uid));
  if (gs.length === 0) return [];
  const ids = gs.map((g) => g.id);

  const ms: Milestone[] = await db
    .select()
    .from(milestones)
    .where(inArray(milestones.goalId, ids));

  // routine_count: 목표에 연결된 루틴들의 총 실행 횟수
  const rts = await db.select().from(routines).where(inArray(routines.goalId, ids));
  const rtIds = rts.map((r) => r.id);
  const logCounts: { routineId: number; c: number }[] = rtIds.length
    ? await db
        .select({
          routineId: routineLogs.routineId,
          c: sql<number>`count(*)::int`,
        })
        .from(routineLogs)
        .where(inArray(routineLogs.routineId, rtIds))
        .groupBy(routineLogs.routineId)
    : [];

  // task_rate: 목표에 연결된 프로젝트들의 할일 완료율
  const prjs = await db
    .select()
    .from(projects)
    .where(inArray(projects.goalId, ids));
  const pIds = prjs.map((p) => p.id);
  const taskStats: { projectId: number | null; total: number; done: number }[] =
    pIds.length
      ? await db
          .select({
            projectId: tasks.projectId,
            total: sql<number>`count(*)::int`,
            done: sql<number>`count(*) filter (where ${tasks.done})::int`,
          })
          .from(tasks)
          .where(inArray(tasks.projectId, pIds))
          .groupBy(tasks.projectId)
      : [];

  // money: 연결 계좌 잔액
  const accts = await db
    .select()
    .from(moneyAccounts)
    .where(eq(moneyAccounts.userId, uid));

  return gs.map((g) => {
    const myMs = ms.filter((m) => m.goalId === g.id);
    const doneMs = myMs.filter((m) => m.done);
    const undone = myMs
      .filter((m) => !m.done)
      .sort((a, b) => (a.dueDate ?? "9999").localeCompare(b.dueDate ?? "9999"));

    let progress: number | null = null;
    let currentValue: number | null = null;
    let targetValue: number | null = null;
    switch (g.metricType) {
      case "milestone":
        progress = myMs.length ? doneMs.length / myMs.length : null;
        currentValue = doneMs.length;
        targetValue = myMs.length || null;
        break;
      case "manual":
        // 시작값이 있으면 (현재-시작)/(목표-시작) - 감량처럼 줄어드는 목표도 올바르게 계산된다
        if (
          g.metricStart != null &&
          g.metricTarget != null &&
          g.metricTarget !== g.metricStart &&
          g.metricCurrent != null
        ) {
          progress = (g.metricCurrent - g.metricStart) / (g.metricTarget - g.metricStart);
        } else {
          progress =
            g.metricTarget && g.metricCurrent != null
              ? g.metricCurrent / g.metricTarget
              : null;
        }
        currentValue = g.metricCurrent;
        targetValue = g.metricTarget;
        break;
      case "routine_count": {
        const myRt = rts.filter((r) => r.goalId === g.id).map((r) => r.id);
        const count = logCounts
          .filter((l) => myRt.includes(l.routineId))
          .reduce((s, l) => s + l.c, 0);
        progress = g.metricTarget ? count / g.metricTarget : null;
        currentValue = count;
        targetValue = g.metricTarget;
        break;
      }
      case "task_rate": {
        const myP = prjs.filter((p) => p.goalId === g.id).map((p) => p.id);
        const st = taskStats.filter((t) => t.projectId && myP.includes(t.projectId));
        const total = st.reduce((s, t) => s + t.total, 0);
        const done = st.reduce((s, t) => s + t.done, 0);
        progress = total ? done / total : null;
        currentValue = done;
        targetValue = total || null;
        break;
      }
      case "money": {
        const acct = accts.find((a) => a.id === g.moneyAccountId);
        progress =
          acct && g.metricTarget ? acct.balance / g.metricTarget : null;
        currentValue = acct?.balance ?? null;
        targetValue = g.metricTarget;
        break;
      }
    }
    if (g.status === "done") progress = 1;
    if (progress != null) progress = Math.max(0, Math.min(1, progress));

    return {
      ...g,
      progress,
      nextMilestone: undone[0] ?? null,
      milestoneDone: doneMs.length,
      milestoneTotal: myMs.length,
      currentValue,
      targetValue,
    };
  });
}
