import { notFound } from "next/navigation";
import Link from "next/link";
import { and, asc, eq } from "drizzle-orm";
import { db, projects, tasks, kpis, areas, goals } from "@/db";
import { requireUserId } from "@/lib/session";
import {
  updateProject, deleteProject, createTask, toggleTask, updateTask, deleteTask,
  addKpi, updateKpi, deleteKpi,
} from "@/lib/actions";
import { TaskRow } from "./task-row";
import { NumberInput } from "@/components/number-input";
import { ddayLabel, fmtDate } from "@/lib/dates";
import { Card, DdayBadge, Empty, FieldLabel, ProgressBar, SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function ProjectDetail({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: idStr } = await params;
  const id = Number(idStr);
  if (!Number.isInteger(id)) notFound();

  const uid = await requireUserId();
  const [p] = await db
    .select()
    .from(projects)
    .where(and(eq(projects.id, id), eq(projects.userId, uid)));
  if (!p) notFound();

  const [ts, ks, areaList, goalList] = await Promise.all([
    db.select().from(tasks).where(eq(tasks.projectId, id)).orderBy(asc(tasks.dueDate), asc(tasks.id)),
    db.select().from(kpis).where(eq(kpis.projectId, id)).orderBy(asc(kpis.id)),
    db.select().from(areas).where(eq(areas.userId, uid)),
    db.select().from(goals).where(eq(goals.userId, uid)),
  ]);
  const area = areaList.find((a) => a.id === p.areaId);
  const doneCount = ts.filter((t) => t.done).length;
  const rate = ts.length ? doneCount / ts.length : null;

  return (
    <div className="space-y-8">
      <div className="text-sm">
        <Link href="/projects" className="text-neutral-400 hover:text-neutral-600">← 프로젝트 목록</Link>
      </div>

      <header className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <h1 className="text-2xl font-bold">
            {area && <span className="mr-1.5">{area.icon}</span>}
            {p.title}
          </h1>
          <DdayBadge label={ddayLabel(p.endDate, p.status === "done")} />
        </div>
        {p.purpose && <p className="text-sm text-neutral-500">{p.purpose}</p>}
        <ProgressBar value={rate} pillar={area?.pillar ?? "work"} />
        {ts.length > 0 && (
          <p className="text-xs text-neutral-400">
            할 일 {doneCount}/{ts.length} 완료 · {ts.length - doneCount}개 남음
          </p>
        )}
      </header>

      {/* 할 일: 프로젝트를 완수하기 위한 계획 */}
      <Card>
        <SectionTitle>할 일</SectionTitle>
        {ts.length === 0 ? (
          <Empty>이 프로젝트를 완수하기 위한 할 일들을 추가하는 과정이 곧 계획입니다</Empty>
        ) : (
          <ul className="space-y-1.5">
            {ts.map((t) => (
              <TaskRow
                key={t.id}
                task={{
                  id: t.id,
                  title: t.title,
                  dueDate: t.dueDate,
                  done: t.done,
                  projectId: t.projectId,
                  areaId: t.areaId,
                  ddayLabel: t.dueDate ? ddayLabel(t.dueDate) : "",
                }}
                toggleAction={toggleTask.bind(null, t.id, !t.done)}
                updateAction={updateTask.bind(null, t.id)}
                deleteAction={deleteTask.bind(null, t.id)}
              />
            ))}
          </ul>
        )}
        <form action={createTask} className="mt-3 flex items-end gap-2 border-t border-neutral-100 pt-3">
          <input type="hidden" name="projectId" value={p.id} />
          <label className="flex-1">
            <FieldLabel>할 일 (여러 줄 붙여넣으면 줄마다 등록)</FieldLabel>
            <textarea name="title" placeholder="새 할 일" required rows={2} className="w-full" />
          </label>
          <label>
            <FieldLabel>기한</FieldLabel>
            <input type="date" name="dueDate" />
          </label>
          <button type="submit">추가</button>
        </form>
      </Card>

      {/* KPI: 목표 수치 vs 결과 */}
      <Card>
        <SectionTitle>KPI</SectionTitle>
        {ks.length > 0 && (
          <div className="mb-3 space-y-2">
            {ks.map((k) => (
              <form key={k.id} action={updateKpi.bind(null, k.id)} className="flex items-center gap-2">
                <span className="min-w-32 flex-1 text-sm font-medium">{k.name}</span>
                <label className="flex items-center gap-1 text-xs text-neutral-400">
                  목표
                  <NumberInput name="target" defaultValue={k.target} className="w-28 text-right" />
                  {k.unit && <span className="text-neutral-500">{k.unit}</span>}
                </label>
                <label className="flex items-center gap-1 text-xs text-neutral-400">
                  달성 현황
                  <NumberInput name="actual" defaultValue={k.actual} className="w-28 text-right" />
                  {k.unit && <span className="text-neutral-500">{k.unit}</span>}
                </label>
                <button type="submit" className="btn-ghost text-xs">저장</button>
                <button formAction={deleteKpi.bind(null, k.id)} className="text-xs text-neutral-300 hover:text-red-500">
                  삭제
                </button>
              </form>
            ))}
          </div>
        )}
        <form action={addKpi.bind(null, p.id)} className="flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-3">
          <label className="min-w-40 flex-1">
            <FieldLabel>KPI 항목</FieldLabel>
            <input name="name" placeholder="KPI (예: 해외 팔로워)" required className="w-full" />
          </label>
          <label>
            <FieldLabel>목표 수치</FieldLabel>
            <NumberInput name="target" placeholder="목표 수치" className="w-28" />
          </label>
          <label>
            <FieldLabel>단위</FieldLabel>
            <input name="unit" placeholder="명, 회, 원…" className="w-20" />
          </label>
          <button type="submit">추가</button>
        </form>
      </Card>

      {/* 가이드라인 & 회고 */}
      <Card>
        <SectionTitle>프로젝트 설정 · 가이드라인 · 회고</SectionTitle>
        <form action={updateProject.bind(null, p.id)} className="grid gap-3 sm:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block text-xs text-neutral-500">제목</span>
            <input name="title" defaultValue={p.title} required className="w-full" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-neutral-500">상태</span>
            <select name="status" defaultValue={p.status} className="w-full">
              <option value="planned">예정</option>
              <option value="active">진행 중</option>
              <option value="hold">보류</option>
              <option value="done">완료</option>
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-neutral-500">영역</span>
            <select name="areaId" defaultValue={p.areaId ?? ""} className="w-full">
              <option value="">없음</option>
              {areaList.filter((a) => !a.archived).map((a) => (
                <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-neutral-500">연결 목표</span>
            <select name="goalId" defaultValue={p.goalId ?? ""} className="w-full">
              <option value="">없음</option>
              {goalList.map((g) => (
                <option key={g.id} value={g.id}>🎯 {g.title}</option>
              ))}
            </select>
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-neutral-500">시작일</span>
            <input type="date" name="startDate" defaultValue={p.startDate ?? ""} className="w-full" />
          </label>
          <label className="text-sm">
            <span className="mb-1 block text-xs text-neutral-500">종료일</span>
            <input type="date" name="endDate" defaultValue={p.endDate ?? ""} className="w-full" />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-xs text-neutral-500">목적</span>
            <input name="purpose" defaultValue={p.purpose ?? ""} className="w-full" placeholder="이 프로젝트를 왜 하는가?" />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-xs text-neutral-500">
              가이드라인 - 계획할 때 스스로에게 묻기 (성공 조건은? 가장 큰 리스크는? 첫 행동은?)
            </span>
            <textarea name="guideline" defaultValue={p.guideline ?? ""} rows={3} className="w-full" />
          </label>
          <label className="text-sm sm:col-span-2">
            <span className="mb-1 block text-xs text-neutral-500">
              회고 - 끝났을 때 돌아보기 (잘된 것 / 아쉬운 것 / 다음에 다르게 할 것)
            </span>
            <textarea name="retro" defaultValue={p.retro ?? ""} rows={3} className="w-full" />
          </label>
          <div className="sm:col-span-2">
            <button type="submit">저장</button>
          </div>
        </form>
        <form action={deleteProject.bind(null, p.id)} className="mt-3 border-t border-neutral-100 pt-3">
          <button className="text-xs text-neutral-400 hover:text-red-500">
            이 프로젝트 삭제 (할 일은 인박스로 이동)
          </button>
        </form>
      </Card>
    </div>
  );
}
