import Link from "next/link";
import { and, asc, desc, eq, gt, isNull } from "drizzle-orm";
import { db, tasks, projects } from "@/db";
import {
  createTask, toggleTask, deleteTask, setTaskDueToday,
} from "@/lib/actions";
import { todayStr, ddayLabel, fmtDate } from "@/lib/dates";
import { Card, DdayBadge, Empty, SectionTitle } from "@/components/ui";
import { requireUserId } from "@/lib/session";
import { ImageTaskCapture } from "@/components/image-task-capture";
import { TrackSubmit } from "@/components/track";

export const dynamic = "force-dynamic";

const VIEWS = [
  { key: "today", label: "오늘" },
  { key: "upcoming", label: "예정" },
  { key: "inbox", label: "인박스" },
  { key: "done", label: "완료" },
] as const;
type ViewKey = (typeof VIEWS)[number]["key"];

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const view: ViewKey = (["today", "upcoming", "inbox", "done"].includes(String(sp.view))
    ? String(sp.view)
    : "today") as ViewKey;
  const today = todayStr();
  const uid = await requireUserId();

  const prjs = await db.select().from(projects).where(eq(projects.userId, uid));

  let list;
  if (view === "today") {
    // 오늘 기한 + 밀린 것(기한 지남 & 미완료)
    list = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, uid), eq(tasks.done, false)))
      .orderBy(asc(tasks.dueDate), asc(tasks.id));
    list = list.filter((t) => t.dueDate && t.dueDate <= today);
  } else if (view === "upcoming") {
    // (오늘 뷰 하단에도 예정 미리보기를 함께 보여준다 - 아래 upcoming 쿼리 참조)
    list = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, uid), eq(tasks.done, false), gt(tasks.dueDate, today)))
      .orderBy(asc(tasks.dueDate), asc(tasks.id));
  } else if (view === "inbox") {
    // 갓생 OS 정의: 프로젝트 없음 AND 기한 없음
    list = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, uid), eq(tasks.done, false), isNull(tasks.projectId), isNull(tasks.dueDate)))
      .orderBy(desc(tasks.id));
  } else {
    list = await db
      .select()
      .from(tasks)
      .where(and(eq(tasks.userId, uid), eq(tasks.done, true)))
      .orderBy(desc(tasks.doneAt))
      .limit(100);
  }

  // 오늘 뷰에서는 아래에 예정 건들도 이어서 보여준다
  const upcomingPreview =
    view === "today"
      ? await db
          .select()
          .from(tasks)
          .where(and(eq(tasks.userId, uid), eq(tasks.done, false), gt(tasks.dueDate, today)))
          .orderBy(asc(tasks.dueDate), asc(tasks.id))
      : [];

  const renderRows = (items: typeof list) => (
    <Card className="divide-y divide-neutral-100 p-0">
      {items.map((t) => {
        const prj = prjs.find((p) => p.id === t.projectId);
        const overdue = !t.done && t.dueDate && t.dueDate < today;
        return (
          <div key={t.id} className="group flex items-center gap-3 px-4 py-2.5">
            <form action={toggleTask.bind(null, t.id, !t.done)}>
              {!t.done && <TrackSubmit event="task_complete" params={{ from: "tasks" }} />}
              <button
                className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs ${
                  t.done
                    ? "border-neutral-900 bg-neutral-900 text-white"
                    : "border-neutral-300 bg-white text-transparent hover:border-neutral-500"
                }`}
                aria-label="완료 토글"
              >
                ✓
              </button>
            </form>
            <div className="min-w-0 flex-1">
              <span className={`text-sm ${t.done ? "text-neutral-400 line-through" : ""}`}>
                {t.title}
              </span>
              {prj && (
                <span className="ml-2 rounded bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-500">
                  📁 {prj.title}
                </span>
              )}
            </div>
            {t.dueDate && !t.done && (
              <span className={`text-xs tabular-nums ${overdue ? "text-red-500" : "text-neutral-400"}`}>
                {fmtDate(t.dueDate)}
              </span>
            )}
            {!t.done && <DdayBadge label={t.dueDate ? ddayLabel(t.dueDate) : ""} />}
            <div className="invisible flex items-center gap-2 group-hover:visible">
              {view === "inbox" && (
                <form action={setTaskDueToday.bind(null, t.id)}>
                  <button className="text-xs text-neutral-400 hover:text-neutral-700">오늘로</button>
                </form>
              )}
              <form action={deleteTask.bind(null, t.id)}>
                <button className="text-xs text-neutral-300 hover:text-red-500">삭제</button>
              </form>
            </div>
          </div>
        );
      })}
    </Card>
  );

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-2xl font-bold">✅ 전체 할 일</h1>
        <p className="mt-1 text-sm text-neutral-500">
          프로젝트에서 내려온 1회성 행동 전부 - 오늘 할 것은 🔁 데일리 루틴에서 체크하세요.
        </p>
      </header>

      {/* 빠른 입력: 제목만 치면 인박스로, 날짜를 넣으면 오늘/예정으로 */}
      <Card>
        <form action={createTask} className="flex flex-wrap gap-2">
          <TrackSubmit event="task_create" params={{ from: "tasks" }} />
          <input
            name="title"
            placeholder="떠오르는 대로 적으세요 - 날짜 없이 저장하면 인박스로"
            required
            autoFocus
            className="min-w-56 flex-1"
          />
          <input type="date" name="dueDate" />
          <select name="projectId" defaultValue="">
            <option value="">프로젝트 없음</option>
            {prjs.filter((p) => p.status !== "done").map((p) => (
              <option key={p.id} value={p.id}>{p.title}</option>
            ))}
          </select>
          <button type="submit">추가</button>
        </form>
      </Card>

      {/* 이미지 → 할 일 추출 (AI) */}
      <ImageTaskCapture
        projects={prjs.filter((p) => p.status !== "done").map((p) => ({ id: p.id, title: p.title }))}
      />

      <div className="flex gap-1.5">
        {VIEWS.map((v) => (
          <Link
            key={v.key}
            href={`/tasks?view=${v.key}`}
            className={`rounded-full px-3.5 py-1.5 text-sm ${
              view === v.key
                ? "bg-neutral-900 font-medium text-white"
                : "bg-white text-neutral-500 hover:bg-neutral-100"
            }`}
          >
            {v.label}
          </Link>
        ))}
      </div>

      <section>
        {list.length === 0 ? (
          <Empty>
            {view === "today" && "오늘 할 일이 없습니다 🎉"}
            {view === "upcoming" && "예정된 할 일이 없습니다"}
            {view === "inbox" && "인박스가 비어있습니다 - 떠오르는 것을 위에 던져두세요"}
            {view === "done" && "완료된 할 일이 없습니다"}
          </Empty>
        ) : (
          renderRows(list)
        )}
      </section>

      {/* 오늘 뷰 하단: 앞으로 예정된 건들도 이어서 보여준다 */}
      {view === "today" && upcomingPreview.length > 0 && (
        <section>
          <SectionTitle>📅 예정 ({upcomingPreview.length})</SectionTitle>
          {renderRows(upcomingPreview)}
        </section>
      )}
    </div>
  );
}
