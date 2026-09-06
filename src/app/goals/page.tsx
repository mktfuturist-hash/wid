import Link from "next/link";
import { db, areas, milestones } from "@/db";
import { asc, eq } from "drizzle-orm";
import { getGoalsWithProgress } from "@/lib/progress";
import { createGoal, deleteGoal } from "@/lib/actions";
import { requireUserId } from "@/lib/session";
import { ddayLabel, fmtDate } from "@/lib/dates";
import {
  AreaChip, Card, DdayBadge, Empty, FieldLabel, PillarDot, ProgressBar, SectionTitle,
} from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";

export const dynamic = "force-dynamic";

const METRIC_LABEL: Record<string, string> = {
  milestone: "중간 목표 체크",
  manual: "수치 직접 입력",
  routine_count: "루틴 실행 횟수",
  task_rate: "프로젝트 할일 완료율",
  money: "계좌 잔액",
};

export default async function GoalsPage() {
  const uid = await requireUserId();
  const [gs, areaList, msList] = await Promise.all([
    getGoalsWithProgress(uid),
    db.select().from(areas).where(eq(areas.userId, uid)).orderBy(asc(areas.sort), asc(areas.id)),
    db.select().from(milestones).where(eq(milestones.userId, uid)).orderBy(asc(milestones.dueDate), asc(milestones.id)),
  ]);
  const msByGoal = new Map<number, typeof msList>();
  for (const m of msList) {
    const list = msByGoal.get(m.goalId) ?? [];
    list.push(m);
    msByGoal.set(m.goalId, list);
  }
  const activeAreas = areaList.filter((a) => !a.archived);
  const active = gs.filter((g) => g.status === "active");
  const done = gs.filter((g) => g.status === "done");
  const hold = gs.filter((g) => g.status === "hold");
  const areaOf = (areaId: number | null) => areaList.find((a) => a.id === areaId);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">🎯 세부 목표</h1>
        <p className="mt-1 text-sm text-neutral-500">
          어디로 가는가 — 기한과 측정 방식을 정하면 진척률이 자동으로 계산됩니다.
        </p>
      </header>

      <Card>
        <SectionTitle>새 세부 목표</SectionTitle>
        {/* 상위 카테고리(영역)부터 왼쪽에 배치 */}
        <form action={createGoal} className="flex flex-wrap items-end gap-2">
          <label>
            <FieldLabel>영역</FieldLabel>
            <select name="areaId" defaultValue="">
              <option value="">영역 없음</option>
              {activeAreas.map((a) => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>
          </label>
          <label className="min-w-56 flex-1">
            <FieldLabel>목표 이름</FieldLabel>
            <input name="title" placeholder="목표 (예: 72kg까지 감량)" required className="w-full" />
          </label>
          <label>
            <FieldLabel>기한</FieldLabel>
            <input type="date" name="dueDate" />
          </label>
          <label>
            <FieldLabel>진척 측정 방식</FieldLabel>
            <select name="metricType" defaultValue="milestone">
              {Object.entries(METRIC_LABEL).map(([k, v]) => (
                <option key={k} value={k}>{v}</option>
              ))}
            </select>
          </label>
          <button type="submit">추가</button>
        </form>
      </Card>

      <section>
        <SectionTitle>진행 중 ({active.length})</SectionTitle>
        {active.length === 0 ? (
          <Empty>진행 중인 목표가 없습니다. 위에서 첫 목표를 추가해 보세요.</Empty>
        ) : (
          <div className="space-y-3">
            {active.map((g) => {
              const area = areaOf(g.areaId);
              const goalMs = g.metricType === "milestone" ? (msByGoal.get(g.id) ?? []) : [];
              return (
                <Card key={g.id} pillar={area?.pillar} className="relative transition hover:shadow-md">
                  {/* 카드 전체 클릭 → 상세. 버튼들은 z-10으로 위에 얹는다 */}
                  <Link href={`/goals/${g.id}`} className="absolute inset-0" aria-label={g.title} />
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2">
                      {area && <AreaChip icon={area.icon} name={area.name} pillar={area.pillar} />}
                      <span className="truncate font-semibold">{g.title}</span>
                    </div>
                    <div className="relative z-10 flex shrink-0 items-center gap-2 text-xs text-neutral-500">
                      {g.dueDate && <span>{fmtDate(g.dueDate)}</span>}
                      <DdayBadge label={ddayLabel(g.dueDate, false)} />
                      <Link
                        href={`/goals/${g.id}`}
                        className="rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
                      >
                        수정
                      </Link>
                      <form action={deleteGoal.bind(null, g.id)}>
                        <ConfirmButton
                          message={`'${g.title}' 목표를 삭제할까요? 중간 목표도 함께 삭제됩니다.`}
                          className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
                        >
                          삭제
                        </ConfirmButton>
                      </form>
                    </div>
                  </div>
                  <div className="mt-2.5">
                    <ProgressBar value={g.progress} pillar={area?.pillar ?? "life"} />
                  </div>
                  {/* 중간 목표 측정 목표는 카드 안에 중간 목표 목록·달성 여부를 바로 보여준다 */}
                  {goalMs.length > 0 && (
                    <ul className="mt-2.5 space-y-1 border-t border-neutral-100 pt-2.5">
                      {goalMs.map((m) => (
                        <li key={m.id} className="flex items-center gap-2 text-xs">
                          <span
                            className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                              m.done
                                ? "border-neutral-900 bg-neutral-900 text-white"
                                : "border-neutral-300 bg-white text-transparent"
                            }`}
                          >
                            ✓
                          </span>
                          <span className={`flex-1 truncate ${m.done ? "text-neutral-400 line-through" : "text-neutral-600"}`}>
                            {m.title}
                          </span>
                          {m.dueDate && (
                            <span className="tabular-nums text-neutral-400">{fmtDate(m.dueDate)}</span>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                  <div className="mt-1.5 flex items-center justify-between text-xs text-neutral-400">
                    <span>{METRIC_LABEL[g.metricType]}</span>
                    {goalMs.length === 0 && g.nextMilestone && (
                      <span>
                        다음: {g.nextMilestone.title}
                        {g.nextMilestone.dueDate && ` (${fmtDate(g.nextMilestone.dueDate)})`}
                      </span>
                    )}
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </section>

      {hold.length > 0 && (
        <section>
          <SectionTitle>보류 ({hold.length})</SectionTitle>
          <div className="space-y-2">
            {hold.map((g) => (
              <Link key={g.id} href={`/goals/${g.id}`} className="flex items-center gap-2 text-sm text-neutral-500 hover:underline">
                <PillarDot pillar={areaOf(g.areaId)?.pillar} />
                ⏸️ {g.title}
              </Link>
            ))}
          </div>
        </section>
      )}

      {done.length > 0 && (
        <section>
          <SectionTitle>달성 🎉 ({done.length})</SectionTitle>
          <div className="space-y-2">
            {done.map((g) => (
              <Link key={g.id} href={`/goals/${g.id}`} className="flex items-center gap-2 text-sm text-neutral-400 hover:underline">
                <PillarDot pillar={areaOf(g.areaId)?.pillar} />
                <span className="line-through">{g.title}</span>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
