import { asc, eq, inArray } from "drizzle-orm";
import { db, routines, routineLogs, goals, areas } from "@/db";
import { requireUserId } from "@/lib/session";
import {
  createRoutine, logRoutine, unlogRoutineToday, setRoutineStatus, deleteRoutine, updateRoutinePeriod,
} from "@/lib/actions";
import { computeRoutineStats, toKstDate } from "@/lib/routine-stats";
import { todayStr, fmtDate } from "@/lib/dates";
import { Card, Empty, FieldLabel, SectionTitle } from "@/components/ui";
import { TrackSubmit } from "@/components/track";

export const dynamic = "force-dynamic";

/* start~end의 날짜 목록 (안전상 최대 140일) */
function periodDays(start: string, end: string): string[] {
  const out: string[] = [];
  let t = new Date(start + "T00:00:00Z").getTime();
  const endT = new Date(end + "T00:00:00Z").getTime();
  while (t <= endT && out.length < 140) {
    out.push(new Date(t).toISOString().slice(0, 10));
    t += 86400000;
  }
  return out;
}

export default async function RoutinesPage() {
  const uid = await requireUserId();
  const [rts, goalList, areaList] = await Promise.all([
    db.select().from(routines).where(eq(routines.userId, uid)).orderBy(asc(routines.id)),
    db.select().from(goals).where(eq(goals.userId, uid)),
    db.select().from(areas).where(eq(areas.userId, uid)),
  ]);
  const logs = rts.length
    ? await db
        .select()
        .from(routineLogs)
        .where(inArray(routineLogs.routineId, rts.map((r) => r.id)))
    : [];

  const active = rts.filter((r) => r.status === "active");
  const stopped = rts.filter((r) => r.status === "stopped");
  const statsOf = (id: number) =>
    computeRoutineStats(logs.filter((l) => l.routineId === id).map((l) => l.loggedAt));

  // 우측 미니 히트맵용 최근 28일 날짜 (과거→오늘, KST)
  const t0 = new Date(todayStr() + "T00:00:00+09:00").getTime();
  const miniDates = Array.from({ length: 28 }, (_, i) =>
    toKstDate(new Date(t0 - (27 - i) * 86400000))
  );

  const totalThisMonth = active.reduce((s, r) => s + statsOf(r.id).monthCount, 0);
  const totalAll = logs.length;

  return (
    <div className="space-y-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold">🔁 데일리 루틴</h1>
          <p className="mt-1 text-sm text-neutral-500">
            매일 반복하는 행동 - 버튼 한 번으로 기록되고, 이어지면 스트릭이 쌓입니다.
          </p>
        </div>
        <div className="flex gap-4 text-right">
          <div>
            <div className="text-xl font-bold tabular-nums">{totalThisMonth}</div>
            <div className="text-xs text-neutral-400">이번 달</div>
          </div>
          <div>
            <div className="text-xl font-bold tabular-nums">{totalAll}</div>
            <div className="text-xs text-neutral-400">전체</div>
          </div>
        </div>
      </header>

      <Card>
        <SectionTitle>새 루틴</SectionTitle>
        <form action={createRoutine} className="flex flex-wrap items-end gap-2">
          <TrackSubmit event="routine_create" />
          <label className="min-w-56 flex-1">
            <FieldLabel>루틴 이름</FieldLabel>
            <input name="title" placeholder="루틴 (예: 매일 아침 독서 30분)" required className="w-full" />
          </label>
          <label>
            <FieldLabel>연결 목표</FieldLabel>
            <select name="goalId" defaultValue="">
              <option value="">연결 목표 없음</option>
              {goalList.filter((g) => g.status === "active").map((g) => (
                <option key={g.id} value={g.id}>🎯 {g.title}</option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>영역</FieldLabel>
            <select name="areaId" defaultValue="">
              <option value="">영역 없음</option>
              {areaList.filter((a) => !a.archived).map((a) => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>
          </label>
          <label>
            <FieldLabel>기간 시작 (비우면 상시)</FieldLabel>
            <input type="date" name="startDate" />
          </label>
          <label>
            <FieldLabel>기간 종료</FieldLabel>
            <input type="date" name="endDate" />
          </label>
          <button type="submit">추가</button>
        </form>
      </Card>

      <section>
        <SectionTitle>진행 중 ({active.length})</SectionTitle>
        {active.length === 0 ? (
          <Empty>루틴이 없습니다. 목표 달성을 위해 꾸준히 할 것을 추가해 보세요.</Empty>
        ) : (
          <div className="space-y-3">
            {active.map((r) => {
              const st = statsOf(r.id);
              const goal = goalList.find((g) => g.id === r.goalId);
              const hasPeriod = !!(r.startDate && r.endDate);
              const daySet = new Set(
                logs.filter((l) => l.routineId === r.id).map((l) => toKstDate(l.loggedAt))
              );
              const days = hasPeriod ? periodDays(r.startDate!, r.endDate!) : [];
              const doneInPeriod = days.filter((d) => daySet.has(d)).length;
              const today = todayStr();
              return (
                <Card key={r.id}>
                  <div className="flex items-center gap-3">
                    {st.doneToday ? (
                      <form action={unlogRoutineToday.bind(null, r.id)}>
                        <TrackSubmit event="routine_uncheck" params={{ from: "routines" }} />
                        <button
                          className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500 text-lg text-white shadow-sm"
                          title="오늘 기록 취소"
                        >
                          ✓
                        </button>
                      </form>
                    ) : (
                      <form action={logRoutine.bind(null, r.id)}>
                        <TrackSubmit event="routine_check" params={{ from: "routines", streak: st.streak + 1 }} />
                        <button
                          className="flex h-9 w-9 items-center justify-center rounded-xl border-2 border-dashed border-neutral-300 text-lg text-neutral-300 hover:border-emerald-400 hover:text-emerald-400"
                          title="루틴 기록"
                        >
                          ✓
                        </button>
                      </form>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{r.title}</div>
                      <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-neutral-400">
                        <span className={`rounded px-1.5 py-0.5 ${hasPeriod ? "bg-blue-50 text-blue-600" : "bg-neutral-100 text-neutral-500"}`}>
                          {hasPeriod ? `📅 ${fmtDate(r.startDate!)} ~ ${fmtDate(r.endDate!)}` : "매일 · 상시"}
                        </span>
                        {goal && <span>🎯 {goal.title}</span>}
                        <span>이번 달 {st.monthCount}회</span>
                        <span>· 전체 {st.totalCount}회</span>
                        {st.streak > 0 && (
                          <span className="font-semibold text-orange-500">🔥 {st.streak}일 연속</span>
                        )}
                      </div>
                    </div>
                    {/* 최근 28일 미니 히트맵 - 기간 루틴도 동일하게, 기간 밖 날짜만 흐리게 */}
                    <div className="hidden gap-0.5 sm:grid" style={{ gridTemplateColumns: "repeat(14, 8px)" }}>
                      {miniDates.map((d) => {
                        const outOfPeriod = hasPeriod && (d < r.startDate! || d > r.endDate!);
                        return (
                          <div
                            key={d}
                            title={fmtDate(d)}
                            className={`h-2 w-2 rounded-[2px] ${
                              daySet.has(d)
                                ? "bg-emerald-400"
                                : outOfPeriod
                                  ? "bg-neutral-100"
                                  : "bg-neutral-200/70"
                            }`}
                          />
                        );
                      })}
                    </div>
                    <div className="flex flex-col items-end gap-1">
                      <form action={setRoutineStatus.bind(null, r.id, "stopped")}>
                        <button className="text-xs text-neutral-300 hover:text-neutral-500">중단</button>
                      </form>
                    </div>
                  </div>

                  {/* 기간 히트맵 - 설정된 기간 전체를 블록으로 */}
                  {hasPeriod && (
                    <div className="mt-3 border-t border-neutral-100 pt-3">
                      <div className="mb-1.5 flex items-center justify-between text-xs text-neutral-400">
                        <span>기간 달성 {doneInPeriod}/{days.length}일</span>
                        <span className="tabular-nums">{Math.round((doneInPeriod / days.length) * 100)}%</span>
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {days.map((d) => {
                          const done = daySet.has(d);
                          const isToday = d === today;
                          const future = d > today;
                          return (
                            <div
                              key={d}
                              title={`${fmtDate(d)}${done ? " ✓" : ""}`}
                              className={`h-3.5 w-3.5 rounded-[3px] ${
                                done
                                  ? "bg-emerald-500"
                                  : future
                                    ? "bg-neutral-100"
                                    : "bg-neutral-300/70"
                              } ${isToday ? "ring-2 ring-neutral-900 ring-offset-1" : ""}`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* 기간 설정/변경 - 접힘 폼 */}
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs text-neutral-400 hover:text-neutral-600">
                      기간 {hasPeriod ? "변경" : "설정"} (비우고 저장하면 상시로)
                    </summary>
                    <form action={updateRoutinePeriod.bind(null, r.id)} className="mt-2 flex flex-wrap items-end gap-2">
                      <label>
                        <FieldLabel>시작일</FieldLabel>
                        <input type="date" name="startDate" defaultValue={r.startDate ?? ""} />
                      </label>
                      <label>
                        <FieldLabel>종료일</FieldLabel>
                        <input type="date" name="endDate" defaultValue={r.endDate ?? ""} />
                      </label>
                      <button type="submit" className="btn-ghost">저장</button>
                    </form>
                  </details>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {stopped.length > 0 && (
        <section>
          <SectionTitle>중단됨 ({stopped.length})</SectionTitle>
          <div className="space-y-2">
            {stopped.map((r) => (
              <div key={r.id} className="flex items-center gap-3 text-sm text-neutral-400">
                <span>⏸️ {r.title}</span>
                <form action={setRoutineStatus.bind(null, r.id, "active")}>
                  <button className="text-xs underline hover:text-neutral-600">재개</button>
                </form>
                <form action={deleteRoutine.bind(null, r.id)}>
                  <button className="text-xs text-neutral-300 hover:text-red-500">삭제</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
