import Link from "next/link";
import { and, asc, eq, inArray } from "drizzle-orm";
import { db, areas, tasks, routines, routineLogs } from "@/db";
import { getGoalsWithProgress } from "@/lib/progress";
import { createTask, toggleTask, logRoutine, unlogRoutineToday } from "@/lib/actions";
import { computeRoutineStats } from "@/lib/routine-stats";
import { requireUserId } from "@/lib/session";
import { auth, authEnabled } from "@/auth";
import { Landing } from "@/components/landing";
import { todayStr, ddayLabel, fmtDate } from "@/lib/dates";
import {
  Card, DdayBadge, Empty, PILLARS, ProgressBar, SectionTitle, type Pillar,
} from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function Home() {
  // 비로그인 방문자에게는 랜딩을, 로그인 사용자에게는 대시보드를
  if (authEnabled && !(await auth())) {
    return <Landing />;
  }
  const today = todayStr();
  const uid = await requireUserId();
  const [gs, areaList, openTasks, activeRoutines] = await Promise.all([
    getGoalsWithProgress(uid),
    db.select().from(areas).where(eq(areas.userId, uid)).orderBy(asc(areas.sort), asc(areas.id)),
    db.select().from(tasks).where(and(eq(tasks.userId, uid), eq(tasks.done, false))).orderBy(asc(tasks.dueDate)),
    db.select().from(routines).where(and(eq(routines.userId, uid), eq(routines.status, "active"))).orderBy(asc(routines.id)),
  ]);
  const rtLogs = activeRoutines.length
    ? await db
        .select()
        .from(routineLogs)
        .where(inArray(routineLogs.routineId, activeRoutines.map((r) => r.id)))
    : [];
  const todayTasks = openTasks.filter((t) => t.dueDate && t.dueDate <= today);
  const activeGoals = gs.filter((g) => g.status === "active");

  // getDay()는 서버 로컬 시간대(Vercel=UTC) 기준이라 KST 요일이 밀린다 - UTC 기준으로 계산
  const weekday = ["일", "월", "화", "수", "목", "금", "토"][
    new Date(today + "T00:00:00Z").getUTCDay()
  ];

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">올인원 대시보드</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {fmtDate(today)} ({weekday}) - 오늘 할 일 {todayTasks.length}개
          </p>
        </div>
        <Link
          href="/guide"
          className="shrink-0 rounded-full border border-neutral-300 bg-white px-3.5 py-1.5 text-sm font-medium text-neutral-700 shadow-sm hover:border-neutral-500 hover:bg-neutral-50"
        >
          📖 사용 설명서
        </Link>
      </header>

      {/* 온보딩: 아직 아무것도 없을 때 설명서부터 안내 */}
      {areaList.length === 0 && activeGoals.length === 0 && (
        <div className="rounded-xl border border-blue-200 bg-gradient-to-r from-blue-50 to-emerald-50 p-5">
          <h2 className="font-bold">👋 처음 오셨나요?</h2>
          <p className="mt-1 text-sm text-neutral-600">
            입력을 시작하기 전에 <b>사용 설명서</b>를 먼저 읽어보세요. 데이터가 어떻게 연동되는지,
            그리고 <b>영역 → 목표 → 중간 목표 → 프로젝트 → 할 일</b> 순서로 세팅하는 법을 5분 안에
            안내합니다.
          </p>
          <Link
            href="/guide"
            className="mt-3 inline-block rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white hover:bg-neutral-700"
          >
            사용 설명서 읽고 시작하기 →
          </Link>
        </div>
      )}

      {/* 인박스 빠른 던지기 */}
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

      {/* 일 │ 삶 │ 돈 3열: 각 기둥의 목표 진척 */}
      <div className="grid gap-4 lg:grid-cols-3">
        {(["work", "life", "money"] as Pillar[]).map((pillar) => {
          const pillarAreaIds = areaList
            .filter((a) => a.pillar === pillar)
            .map((a) => a.id);
          const pillarGoals = activeGoals.filter(
            (g) => g.areaId && pillarAreaIds.includes(g.areaId)
          );
          return (
            <Card key={pillar}>
              <div className="mb-3 flex items-center justify-between">
                <h2 className={`text-sm font-bold ${PILLARS[pillar].color}`}>
                  {PILLARS[pillar].icon} {PILLARS[pillar].label}
                </h2>
                <span className="text-xs text-neutral-400">
                  목표 {pillarGoals.length}
                </span>
              </div>
              {pillarGoals.length === 0 ? (
                <p className="py-4 text-center text-xs text-neutral-400">
                  이 기둥의 목표가 없습니다
                </p>
              ) : (
                <div className="space-y-3.5">
                  {pillarGoals.map((g) => (
                    <Link key={g.id} href={`/goals/${g.id}`} className="block">
                      <div className="mb-1 flex items-center justify-between gap-2">
                        <span className="truncate text-sm font-medium hover:underline">
                          {g.title}
                        </span>
                        <DdayBadge label={ddayLabel(g.dueDate)} />
                      </div>
                      <ProgressBar value={g.progress} pillar={pillar} />
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          );
        })}
      </div>

      {/* 오늘의 루틴: 원터치 체크 */}
      {activeRoutines.length > 0 && (
        <section>
          <SectionTitle>🔁 오늘의 루틴</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {activeRoutines.map((r) => {
              const st = computeRoutineStats(
                rtLogs.filter((l) => l.routineId === r.id).map((l) => l.loggedAt)
              );
              return st.doneToday ? (
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
              );
            })}
          </div>
        </section>
      )}

      {/* 오늘의 할 일 */}
      <section>
        <SectionTitle>✅ 오늘의 할 일</SectionTitle>
        {todayTasks.length === 0 ? (
          <Empty>
            오늘 기한인 할 일이 없습니다 —{" "}
            <Link href="/tasks?view=inbox" className="underline">인박스 정리하러 가기</Link>
          </Empty>
        ) : (
          <Card className="divide-y divide-neutral-100 p-0">
            {todayTasks.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-4 py-2.5">
                <form action={toggleTask.bind(null, t.id, true)}>
                  <button
                    className="flex h-5 w-5 items-center justify-center rounded-md border border-neutral-300 bg-white text-xs text-transparent hover:border-neutral-500"
                    aria-label="완료"
                  >
                    ✓
                  </button>
                </form>
                <span className="flex-1 text-sm">{t.title}</span>
                {t.dueDate && t.dueDate < today && (
                  <span className="text-xs text-red-500">{ddayLabel(t.dueDate)}</span>
                )}
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
