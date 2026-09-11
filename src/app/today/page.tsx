import Link from "next/link";
import { and, asc, eq, inArray, isNull } from "drizzle-orm";
import { db, tasks, routines, routineLogs, projects } from "@/db";
import { createTask, toggleTask, logRoutine, unlogRoutineToday } from "@/lib/actions";
import { computeRoutineStats } from "@/lib/routine-stats";
import { requireUserId } from "@/lib/session";
import { todayStr, ddayLabel, fmtDate } from "@/lib/dates";
import { Card, Empty } from "@/components/ui";
import { ImageTaskCapture } from "@/components/image-task-capture";

export const dynamic = "force-dynamic";

/* ☀️ 오늘 - 하루의 실행만 모은 화면. 오늘의 데일리 루틴 체크 + 오늘 기한 할 일 처리 */
export default async function TodayPage() {
  const uid = await requireUserId();
  const today = todayStr();
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][
    new Date(today + "T00:00:00Z").getUTCDay()
  ];

  const [openTasks, activeRoutines, prjs] = await Promise.all([
    db.select().from(tasks).where(and(eq(tasks.userId, uid), eq(tasks.done, false))).orderBy(asc(tasks.dueDate), asc(tasks.id)),
    db.select().from(routines).where(and(eq(routines.userId, uid), eq(routines.status, "active"))).orderBy(asc(routines.id)),
    db.select().from(projects).where(eq(projects.userId, uid)),
  ]);
  const rtLogs = activeRoutines.length
    ? await db
        .select()
        .from(routineLogs)
        .where(inArray(routineLogs.routineId, activeRoutines.map((r) => r.id)))
    : [];
  const dueTasks = openTasks.filter((t) => t.dueDate && t.dueDate <= today);
  const overdue = dueTasks.filter((t) => t.dueDate! < today);
  const inboxCount = openTasks.filter((t) => !t.projectId && !t.dueDate).length;
  const projectOf = (id: number | null) => prjs.find((p) => p.id === id);

  const routineStats = activeRoutines.map((r) => ({
    r,
    st: computeRoutineStats(rtLogs.filter((l) => l.routineId === r.id).map((l) => l.loggedAt)),
  }));
  const routineDone = routineStats.filter(({ st }) => st.doneToday).length;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">☀️ 오늘</h1>
        <p className="mt-1 text-sm text-neutral-500">
          {fmtDate(today)} ({weekday}) - 오늘 움직일 것만 모았어요. 계획은 목표·프로젝트에서, 실행은 여기서.
        </p>
      </header>

      {/* 빠른 캡처 - 날짜 없이 저장하면 인박스로 */}
      <Card>
        <form action={createTask} className="flex gap-2">
          <input
            name="title"
            placeholder="⚡ 떠오르는 것을 바로 던지세요 (인박스로 저장)"
            required
            className="flex-1"
          />
          <button type="submit">저장</button>
        </form>
      </Card>

      {/* 이미지 → 할 일 추출 (AI) */}
      <ImageTaskCapture
        projects={prjs.filter((p) => p.status !== "done").map((p) => ({ id: p.id, title: p.title }))}
      />

      {/* 데일리 루틴 - 매일 반복하는 행동 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-500">🔁 데일리 루틴 ({routineDone}/{activeRoutines.length})</h2>
          <Link href="/routines" className="text-xs text-neutral-400 hover:text-neutral-600">
            루틴 관리 →
          </Link>
        </div>
        {activeRoutines.length === 0 ? (
          <Empty>
            아직 루틴이 없습니다 - <Link href="/routines" className="underline">첫 데일리 루틴 만들러 가기</Link>
          </Empty>
        ) : (
          <div className="flex flex-wrap gap-2">
            {routineStats.map(({ r, st }) =>
              st.doneToday ? (
                <form key={r.id} action={unlogRoutineToday.bind(null, r.id)}>
                  <button className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3.5 py-1.5 text-sm font-medium text-white shadow-sm">
                    ✓ {r.title}
                    {st.streak > 1 && <span className="text-xs opacity-80">🔥{st.streak}</span>}
                  </button>
                </form>
              ) : (
                <form key={r.id} action={logRoutine.bind(null, r.id)}>
                  <button className="flex items-center gap-1.5 rounded-full border border-dashed border-neutral-300 bg-white px-3.5 py-1.5 text-sm text-neutral-500 hover:border-emerald-400 hover:text-emerald-600">
                    {r.title}
                  </button>
                </form>
              )
            )}
          </div>
        )}
      </section>

      {/* 오늘 기한 할 일 - 프로젝트에서 내려온 1회성 행동 */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-neutral-500">
            ✅ 오늘 할 일 ({dueTasks.length})
            {overdue.length > 0 && <span className="ml-1.5 text-red-500">· 지연 {overdue.length}</span>}
          </h2>
          <Link href="/tasks" className="text-xs text-neutral-400 hover:text-neutral-600">
            전체 할 일 →
          </Link>
        </div>
        {dueTasks.length === 0 ? (
          <Empty>
            오늘 기한인 할 일이 없습니다 —{" "}
            <Link href="/tasks?view=inbox" className="underline">인박스 정리하러 가기</Link>
          </Empty>
        ) : (
          <Card className="divide-y divide-neutral-100 p-0">
            {dueTasks.map((t) => {
              const prj = projectOf(t.projectId);
              return (
                <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                  <form action={toggleTask.bind(null, t.id, true)}>
                    <button
                      className="flex h-5 w-5 items-center justify-center rounded-md border border-neutral-300 bg-white text-xs text-transparent hover:border-neutral-500"
                      aria-label="완료"
                    >
                      ✓
                    </button>
                  </form>
                  <span className="min-w-0 flex-1 truncate text-sm">{t.title}</span>
                  {prj && (
                    <Link
                      href={`/projects/${prj.id}`}
                      className="hidden max-w-40 truncate rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500 hover:text-neutral-700 sm:block"
                    >
                      📁 {prj.title}
                    </Link>
                  )}
                  {t.dueDate && t.dueDate < today && (
                    <span className="shrink-0 text-xs text-red-500">{ddayLabel(t.dueDate)}</span>
                  )}
                </div>
              );
            })}
          </Card>
        )}
        {inboxCount > 0 && (
          <p className="mt-2 text-xs text-neutral-400">
            📥 인박스에 날짜 없는 할 일이 {inboxCount}개 있어요 —{" "}
            <Link href="/tasks?view=inbox" className="underline">기한을 정해주세요</Link>
          </p>
        )}
      </section>
    </div>
  );
}
