"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { and, eq, gte, lt } from "drizzle-orm";
import {
  db, areas, goals, milestones, tasks, projects, kpis, routines, routineLogs,
  moneyAccounts, moneySnapshots, moneyTxns, notes, reviews,
} from "@/db";
import { monthStr, todayStr } from "@/lib/dates";
import { isAdmin, requireUserId } from "@/lib/session";
import { users } from "@/db/schema";
import { signOut } from "@/auth";

function str(fd: FormData, key: string): string | null {
  const v = fd.get(key);
  const s = typeof v === "string" ? v.trim() : "";
  return s === "" ? null : s;
}
function num(fd: FormData, key: string): number | null {
  const s = str(fd, key);
  if (s == null) return null;
  const n = Number(s.replaceAll(",", ""));
  return Number.isFinite(n) ? n : null;
}

function refresh() {
  revalidatePath("/", "layout");
}

/** 소유권 검증: 해당 사용자의 행이 맞는지. 아니면 무시(악의적 요청 차단) */
async function owns(
  table: typeof goals | typeof projects | typeof routines | typeof moneyAccounts,
  id: number,
  uid: number
): Promise<boolean> {
  const rows = await db
    .select({ id: table.id })
    .from(table)
    .where(and(eq(table.id, id), eq(table.userId, uid)));
  return rows.length > 0;
}

export async function logout() {
  await signOut({ redirectTo: "/" });
}

// ── 어드민 ──
/** 사용자와 그 사용자의 모든 데이터를 삭제 (어드민 전용, 본인 계정은 불가) */
export async function adminDeleteUser(targetId: number) {
  if (!(await isAdmin())) return;
  const myId = await requireUserId();
  if (targetId === myId) return; // 본인 계정 보호
  await db.transaction(async (tx) => {
    // FK 자식 → 부모 순서로 지운다 (13개 user_id 테이블 전부)
    await tx.delete(routineLogs).where(eq(routineLogs.userId, targetId));
    await tx.delete(kpis).where(eq(kpis.userId, targetId));
    await tx.delete(tasks).where(eq(tasks.userId, targetId));
    await tx.delete(milestones).where(eq(milestones.userId, targetId));
    await tx.delete(routines).where(eq(routines.userId, targetId));
    await tx.delete(projects).where(eq(projects.userId, targetId));
    await tx.delete(goals).where(eq(goals.userId, targetId));
    await tx.delete(moneyTxns).where(eq(moneyTxns.userId, targetId));
    await tx.delete(moneySnapshots).where(eq(moneySnapshots.userId, targetId));
    await tx.delete(moneyAccounts).where(eq(moneyAccounts.userId, targetId));
    await tx.delete(notes).where(eq(notes.userId, targetId));
    await tx.delete(reviews).where(eq(reviews.userId, targetId));
    await tx.delete(areas).where(eq(areas.userId, targetId));
    await tx.delete(users).where(eq(users.id, targetId));
  });
  refresh();
}

// ── 영역 ──
export async function createArea(fd: FormData) {
  const uid = await requireUserId();
  const name = str(fd, "name");
  if (!name) return;
  await db.insert(areas).values({
    userId: uid,
    name,
    icon: str(fd, "icon"),
    pillar: (str(fd, "pillar") ?? "life") as "work" | "life" | "money",
    guideline: str(fd, "guideline"),
  });
  refresh();
}

export async function updateArea(id: number, fd: FormData) {
  const uid = await requireUserId();
  const name = str(fd, "name");
  if (!name) return;
  await db
    .update(areas)
    .set({
      name,
      icon: str(fd, "icon"),
      pillar: (str(fd, "pillar") ?? "life") as "work" | "life" | "money",
      guideline: str(fd, "guideline"),
    })
    .where(and(eq(areas.id, id), eq(areas.userId, uid)));
  refresh();
}

export async function toggleAreaArchived(id: number, archived: boolean) {
  const uid = await requireUserId();
  await db
    .update(areas)
    .set({ archived })
    .where(and(eq(areas.id, id), eq(areas.userId, uid)));
  refresh();
}

// ── 목표 ──
export async function createGoal(fd: FormData) {
  const uid = await requireUserId();
  const title = str(fd, "title");
  if (!title) return;
  const [g] = await db
    .insert(goals)
    .values({
      userId: uid,
      title,
      areaId: num(fd, "areaId"),
      dueDate: str(fd, "dueDate"),
      description: str(fd, "description"),
      metricType: (str(fd, "metricType") ?? "milestone") as
        | "manual" | "milestone" | "routine_count" | "task_rate" | "money",
      metricTarget: num(fd, "metricTarget"),
      metricCurrent: num(fd, "metricCurrent"),
      metricStart: num(fd, "metricStart"),
      metricUnit: str(fd, "metricUnit"),
      moneyAccountId: num(fd, "moneyAccountId"),
    })
    .returning({ id: goals.id });
  refresh();
  redirect(`/goals/${g.id}`);
}

export async function updateGoal(id: number, fd: FormData) {
  const uid = await requireUserId();
  const title = str(fd, "title");
  if (!title) return;
  await db
    .update(goals)
    .set({
      title,
      areaId: num(fd, "areaId"),
      dueDate: str(fd, "dueDate"),
      description: str(fd, "description"),
      status: (str(fd, "status") ?? "active") as "active" | "done" | "hold",
      metricType: (str(fd, "metricType") ?? "milestone") as
        | "manual" | "milestone" | "routine_count" | "task_rate" | "money",
      metricTarget: num(fd, "metricTarget"),
      metricCurrent: num(fd, "metricCurrent"),
      metricStart: num(fd, "metricStart"),
      metricUnit: str(fd, "metricUnit"),
      moneyAccountId: num(fd, "moneyAccountId"),
    })
    .where(and(eq(goals.id, id), eq(goals.userId, uid)));
  refresh();
}

/* '수치 직접 입력' 목표의 현재값만 수시로 갱신하는 빠른 업데이트 */
export async function updateGoalCurrent(id: number, fd: FormData) {
  const uid = await requireUserId();
  const current = num(fd, "metricCurrent");
  if (current == null) return;
  await db
    .update(goals)
    .set({ metricCurrent: current })
    .where(and(eq(goals.id, id), eq(goals.userId, uid)));
  refresh();
}

export async function setGoalStatus(id: number, status: "active" | "done" | "hold") {
  const uid = await requireUserId();
  await db
    .update(goals)
    .set({ status })
    .where(and(eq(goals.id, id), eq(goals.userId, uid)));
  refresh();
}

export async function deleteGoal(id: number) {
  const uid = await requireUserId();
  if (!(await owns(goals, id, uid))) return;
  await db.delete(milestones).where(eq(milestones.goalId, id));
  await db.delete(goals).where(and(eq(goals.id, id), eq(goals.userId, uid)));
  refresh();
  redirect("/goals");
}

// ── 마일스톤 ──
export async function addMilestone(goalId: number, fd: FormData) {
  const uid = await requireUserId();
  const title = str(fd, "title");
  if (!title) return;
  if (!(await owns(goals, goalId, uid))) return;
  await db
    .insert(milestones)
    .values({ userId: uid, goalId, title, dueDate: str(fd, "dueDate") });
  refresh();
}

export async function updateMilestone(id: number, fd: FormData) {
  const uid = await requireUserId();
  const title = str(fd, "title");
  if (!title) return;
  await db
    .update(milestones)
    .set({ title, dueDate: str(fd, "dueDate") })
    .where(and(eq(milestones.id, id), eq(milestones.userId, uid)));
  refresh();
}

export async function toggleMilestone(id: number, done: boolean) {
  const uid = await requireUserId();
  await db
    .update(milestones)
    .set({ done, doneAt: done ? new Date() : null })
    .where(and(eq(milestones.id, id), eq(milestones.userId, uid)));
  refresh();
}

export async function deleteMilestone(id: number) {
  const uid = await requireUserId();
  await db
    .delete(milestones)
    .where(and(eq(milestones.id, id), eq(milestones.userId, uid)));
  refresh();
}

// ── 할 일 ──
export async function createTask(fd: FormData) {
  const uid = await requireUserId();
  const title = str(fd, "title");
  if (!title) return;
  const projectId = num(fd, "projectId");
  if (projectId != null && !(await owns(projects, projectId, uid))) return;
  await db.insert(tasks).values({
    userId: uid,
    title,
    projectId,
    areaId: num(fd, "areaId"),
    dueDate: str(fd, "dueDate"), // 없고 프로젝트도 없으면 자동으로 인박스
  });
  refresh();
}

/* 이미지 추출 등 여러 건을 한 번에 등록 (프로젝트 지정 시 소유권 검증) */
export async function createTasksBulk(
  items: { title: string; dueDate: string | null }[],
  projectId: number | null
) {
  const uid = await requireUserId();
  let prj: { areaId: number | null } | null = null;
  if (projectId != null) {
    const [row] = await db
      .select({ areaId: projects.areaId })
      .from(projects)
      .where(and(eq(projects.id, projectId), eq(projects.userId, uid)));
    if (!row) return;
    prj = row;
  }
  const values = items
    .map((t) => ({ title: t.title.trim().slice(0, 200), dueDate: t.dueDate }))
    .filter((t) => t.title.length > 0)
    .slice(0, 30)
    .map((t) => ({
      userId: uid,
      title: t.title,
      dueDate: t.dueDate,
      projectId: projectId ?? null,
      areaId: prj?.areaId ?? null,
    }));
  if (values.length === 0) return;
  await db.insert(tasks).values(values);
  refresh();
}

export async function toggleTask(id: number, done: boolean) {
  const uid = await requireUserId();
  await db
    .update(tasks)
    .set({ done, doneAt: done ? new Date() : null })
    .where(and(eq(tasks.id, id), eq(tasks.userId, uid)));
  refresh();
}

export async function setTaskDue(id: number, dueDate: string | null) {
  const uid = await requireUserId();
  await db
    .update(tasks)
    .set({ dueDate })
    .where(and(eq(tasks.id, id), eq(tasks.userId, uid)));
  refresh();
}

export async function setTaskDueToday(id: number) {
  await setTaskDue(id, todayStr());
}

export async function updateTask(id: number, fd: FormData) {
  const uid = await requireUserId();
  const title = str(fd, "title");
  if (!title) return;
  await db
    .update(tasks)
    .set({
      title,
      dueDate: str(fd, "dueDate"),
      projectId: num(fd, "projectId"),
      areaId: num(fd, "areaId"),
    })
    .where(and(eq(tasks.id, id), eq(tasks.userId, uid)));
  refresh();
}

export async function deleteTask(id: number) {
  const uid = await requireUserId();
  await db.delete(tasks).where(and(eq(tasks.id, id), eq(tasks.userId, uid)));
  refresh();
}

// ── 프로젝트 ──
export async function createProject(fd: FormData) {
  const uid = await requireUserId();
  const title = str(fd, "title");
  if (!title) return;
  const [p] = await db
    .insert(projects)
    .values({
      userId: uid,
      title,
      areaId: num(fd, "areaId"),
      goalId: num(fd, "goalId"),
      purpose: str(fd, "purpose"),
      startDate: str(fd, "startDate"),
      endDate: str(fd, "endDate"),
    })
    .returning({ id: projects.id });
  refresh();
  redirect(`/projects/${p.id}`);
}

export async function updateProject(id: number, fd: FormData) {
  const uid = await requireUserId();
  const title = str(fd, "title");
  if (!title) return;
  await db
    .update(projects)
    .set({
      title,
      areaId: num(fd, "areaId"),
      goalId: num(fd, "goalId"),
      purpose: str(fd, "purpose"),
      startDate: str(fd, "startDate"),
      endDate: str(fd, "endDate"),
      status: (str(fd, "status") ?? "active") as "planned" | "active" | "done" | "hold",
      guideline: str(fd, "guideline"),
      retro: str(fd, "retro"),
    })
    .where(and(eq(projects.id, id), eq(projects.userId, uid)));
  refresh();
}

export async function deleteProject(id: number) {
  const uid = await requireUserId();
  if (!(await owns(projects, id, uid))) return;
  await db.update(tasks).set({ projectId: null }).where(eq(tasks.projectId, id));
  await db.delete(kpis).where(eq(kpis.projectId, id));
  await db.delete(projects).where(and(eq(projects.id, id), eq(projects.userId, uid)));
  refresh();
  redirect("/projects");
}

// ── KPI ──
export async function addKpi(projectId: number, fd: FormData) {
  const uid = await requireUserId();
  const name = str(fd, "name");
  if (!name) return;
  if (!(await owns(projects, projectId, uid))) return;
  await db.insert(kpis).values({
    userId: uid,
    projectId,
    name,
    target: num(fd, "target"),
    actual: num(fd, "actual"),
    unit: str(fd, "unit"),
  });
  refresh();
}

export async function updateKpi(id: number, fd: FormData) {
  const uid = await requireUserId();
  await db
    .update(kpis)
    .set({ target: num(fd, "target"), actual: num(fd, "actual") })
    .where(and(eq(kpis.id, id), eq(kpis.userId, uid)));
  refresh();
}

export async function deleteKpi(id: number) {
  const uid = await requireUserId();
  await db.delete(kpis).where(and(eq(kpis.id, id), eq(kpis.userId, uid)));
  refresh();
}

// ── 루틴 ──
export async function createRoutine(fd: FormData) {
  const uid = await requireUserId();
  const title = str(fd, "title");
  if (!title) return;
  await db.insert(routines).values({
    userId: uid,
    title,
    goalId: num(fd, "goalId"),
    areaId: num(fd, "areaId"),
    targetFreqWeekly: num(fd, "targetFreqWeekly"),
    startDate: str(fd, "startDate"),
    endDate: str(fd, "endDate"),
  });
  refresh();
}

/* 루틴 기간(시작~종료)만 변경 — 비우면 상시 루틴으로 */
export async function updateRoutinePeriod(id: number, fd: FormData) {
  const uid = await requireUserId();
  await db
    .update(routines)
    .set({ startDate: str(fd, "startDate"), endDate: str(fd, "endDate") })
    .where(and(eq(routines.id, id), eq(routines.userId, uid)));
  refresh();
}

export async function setRoutineStatus(id: number, status: "active" | "stopped") {
  const uid = await requireUserId();
  await db
    .update(routines)
    .set({ status })
    .where(and(eq(routines.id, id), eq(routines.userId, uid)));
  refresh();
}

export async function deleteRoutine(id: number) {
  const uid = await requireUserId();
  await db
    .delete(routines)
    .where(and(eq(routines.id, id), eq(routines.userId, uid)));
  refresh();
}

/** 원터치 루틴 기록 — 클릭 시각 자동 저장 (갓생 OS '루틴 기록' 버튼) */
export async function logRoutine(id: number) {
  const uid = await requireUserId();
  if (!(await owns(routines, id, uid))) return;
  await db.insert(routineLogs).values({ userId: uid, routineId: id });
  refresh();
}

/** 오늘 기록 취소 (실수 클릭 복구) */
export async function unlogRoutineToday(id: number) {
  const uid = await requireUserId();
  const today = todayStr();
  const start = new Date(today + "T00:00:00+09:00");
  const end = new Date(start.getTime() + 86400000);
  await db
    .delete(routineLogs)
    .where(
      and(
        eq(routineLogs.routineId, id),
        eq(routineLogs.userId, uid),
        gte(routineLogs.loggedAt, start),
        lt(routineLogs.loggedAt, end)
      )
    );
  refresh();
}

// ── 노트 ──
export async function createNote(fd: FormData) {
  const uid = await requireUserId();
  const title = str(fd, "title");
  if (!title) return;
  const [n] = await db
    .insert(notes)
    .values({
      userId: uid,
      title,
      type: (str(fd, "type") ?? "note") as "note" | "file" | "link" | "reference",
      importance: num(fd, "importance") ?? 1,
      areaId: num(fd, "areaId"),
      goalId: num(fd, "goalId"),
      projectId: num(fd, "projectId"),
      url: str(fd, "url"),
      bodyMd: str(fd, "bodyMd"),
    })
    .returning({ id: notes.id });
  refresh();
  redirect(`/notes/${n.id}`);
}

export async function updateNote(id: number, fd: FormData) {
  const uid = await requireUserId();
  const title = str(fd, "title");
  if (!title) return;
  await db
    .update(notes)
    .set({
      title,
      type: (str(fd, "type") ?? "note") as "note" | "file" | "link" | "reference",
      importance: num(fd, "importance") ?? 1,
      status: (str(fd, "status") ?? "active") as "active" | "archived",
      areaId: num(fd, "areaId"),
      goalId: num(fd, "goalId"),
      projectId: num(fd, "projectId"),
      url: str(fd, "url"),
      bodyMd: str(fd, "bodyMd"),
    })
    .where(and(eq(notes.id, id), eq(notes.userId, uid)));
  refresh();
}

export async function deleteNote(id: number) {
  const uid = await requireUserId();
  await db.delete(notes).where(and(eq(notes.id, id), eq(notes.userId, uid)));
  refresh();
  redirect("/notes");
}

// ── 계획·회고 ──
const PLAN_TEMPLATES: Record<string, { plan: string; retro: string }> = {
  daily: {
    plan: "## 오늘의 최우선 3가지\n1. \n2. \n3. \n\n## 오늘의 다짐\n",
    retro: "## 잘한 것\n- \n\n## 아쉬운 것\n- \n\n## 내일 다르게 할 것\n- \n\n## 오늘의 한 줄\n",
  },
  weekly: {
    plan: "## 이번 주 목표\n- \n\n## 요일별 핵심 일정\n- 월: \n- 화: \n- 수: \n- 목: \n- 금: \n- 주말: \n",
    retro: "## 이번 주 성과\n- \n\n## 진척이 없었던 것과 이유\n- \n\n## 다음 주에 집중할 것\n- \n",
  },
  monthly: {
    plan: "## 이번 달 목표 (영역별)\n- Work: \n- Life: \n- Money: \n\n## 이번 달의 테마\n",
    retro: "## 목표 대비 결과\n- \n\n## 이번 달 배운 것\n- \n\n## 다음 달 조정할 것\n- \n",
  },
};

/** 오늘 날짜 기준으로 해당 스코프의 계획·회고 생성 (있으면 그 페이지로 이동) */
export async function createReview(scope: "daily" | "weekly" | "monthly") {
  const uid = await requireUserId();
  const today = todayStr();
  let date = today;
  if (scope === "weekly") {
    // 이번 주 월요일 (KST 날짜의 요일은 UTC 자정 기준으로 계산)
    const d = new Date(today + "T00:00:00Z");
    const diff = (d.getUTCDay() + 6) % 7;
    date = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(
      new Date(d.getTime() - diff * 86400000)
    );
  } else if (scope === "monthly") {
    date = today.slice(0, 7) + "-01";
  }
  const existing = await db
    .select()
    .from(reviews)
    .where(
      and(eq(reviews.scope, scope), eq(reviews.date, date), eq(reviews.userId, uid))
    );
  if (existing.length) {
    redirect(`/reviews/${existing[0].id}`);
  }
  const tpl = PLAN_TEMPLATES[scope];
  const [r] = await db
    .insert(reviews)
    .values({ userId: uid, scope, date, planMd: tpl.plan, retroMd: tpl.retro })
    .returning({ id: reviews.id });
  refresh();
  redirect(`/reviews/${r.id}`);
}

export async function updateReview(id: number, fd: FormData) {
  const uid = await requireUserId();
  await db
    .update(reviews)
    .set({ planMd: str(fd, "planMd"), retroMd: str(fd, "retroMd") })
    .where(and(eq(reviews.id, id), eq(reviews.userId, uid)));
  refresh();
}

export async function deleteReview(id: number) {
  const uid = await requireUserId();
  await db
    .delete(reviews)
    .where(and(eq(reviews.id, id), eq(reviews.userId, uid)));
  refresh();
  redirect("/reviews");
}

// ── 돈: 계좌 ──
type AccountType = "savings" | "invest" | "realestate" | "loan" | "pension";

async function snapshotAccount(uid: number, accountId: number, balance: number) {
  const month = monthStr();
  const existing = await db
    .select()
    .from(moneySnapshots)
    .where(
      and(eq(moneySnapshots.accountId, accountId), eq(moneySnapshots.month, month))
    );
  if (existing.length) {
    await db
      .update(moneySnapshots)
      .set({ balance })
      .where(eq(moneySnapshots.id, existing[0].id));
  } else {
    await db
      .insert(moneySnapshots)
      .values({ userId: uid, accountId, month, balance });
  }
}

export async function createAccount(fd: FormData) {
  const uid = await requireUserId();
  const name = str(fd, "name");
  if (!name) return;
  const balance = num(fd, "balance") ?? 0;
  const [a] = await db
    .insert(moneyAccounts)
    .values({
      userId: uid,
      name,
      type: (str(fd, "type") ?? "savings") as AccountType,
      balance,
    })
    .returning({ id: moneyAccounts.id });
  await snapshotAccount(uid, a.id, balance);
  refresh();
}

/** 잔액 수기 갱신 — 이번 달 스냅샷도 함께 기록 (순자산 추이의 원천) */
export async function updateAccountBalance(id: number, fd: FormData) {
  const uid = await requireUserId();
  const balance = num(fd, "balance");
  if (balance == null) return;
  if (!(await owns(moneyAccounts, id, uid))) return;
  await db
    .update(moneyAccounts)
    .set({ balance, updatedAt: new Date() })
    .where(and(eq(moneyAccounts.id, id), eq(moneyAccounts.userId, uid)));
  await snapshotAccount(uid, id, balance);
  refresh();
}

export async function deleteAccount(id: number) {
  const uid = await requireUserId();
  if (!(await owns(moneyAccounts, id, uid))) return;
  await db.update(moneyTxns).set({ accountId: null }).where(eq(moneyTxns.accountId, id));
  await db
    .delete(moneyAccounts)
    .where(and(eq(moneyAccounts.id, id), eq(moneyAccounts.userId, uid)));
  refresh();
}

// ── 돈: 일일가계부 ──
export async function addTxn(fd: FormData) {
  const uid = await requireUserId();
  const amount = num(fd, "amount");
  const category = str(fd, "category");
  if (!amount || !category) return;
  await db.insert(moneyTxns).values({
    userId: uid,
    date: str(fd, "date") ?? todayStr(),
    amount: Math.abs(amount),
    direction: (str(fd, "direction") ?? "expense") as "income" | "expense",
    category,
    accountId: num(fd, "accountId"),
    memo: str(fd, "memo"),
  });
  refresh();
}

export async function deleteTxn(id: number) {
  const uid = await requireUserId();
  await db
    .delete(moneyTxns)
    .where(and(eq(moneyTxns.id, id), eq(moneyTxns.userId, uid)));
  refresh();
}
