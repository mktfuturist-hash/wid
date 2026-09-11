"use client";

import { useState } from "react";
import { fmtDate } from "@/lib/dates";
import { DdayBadge } from "@/components/ui";

type Task = {
  id: number;
  title: string;
  dueDate: string | null;
  done: boolean;
  projectId: number | null;
  areaId: number | null;
  ddayLabel: string;
};

/* 프로젝트 할 일 한 줄 - 오른쪽에 흐린 회색 편집/삭제, 편집 시 이름·기한 인라인 수정 */
export function TaskRow({
  task: t,
  toggleAction,
  updateAction,
  deleteAction,
}: {
  task: Task;
  toggleAction: () => Promise<void>;
  updateAction: (fd: FormData) => Promise<void>;
  deleteAction: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li>
        <form
          action={async (fd) => {
            await updateAction(fd);
            setEditing(false);
          }}
          className="flex flex-wrap items-center gap-2"
        >
          {/* updateTask는 폼에 없는 필드를 null로 덮어쓰므로 연결 정보를 보존한다 */}
          {t.projectId != null && <input type="hidden" name="projectId" value={t.projectId} />}
          {t.areaId != null && <input type="hidden" name="areaId" value={t.areaId} />}
          <input name="title" defaultValue={t.title} required className="min-w-40 flex-1" />
          <input type="date" name="dueDate" defaultValue={t.dueDate ?? ""} />
          <button type="submit">저장</button>
          <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
            취소
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2.5">
      <form action={toggleAction}>
        <button
          className={`unstyled flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border text-xs ${
            t.done
              ? "border-neutral-900 bg-neutral-900 text-white"
              : "border-neutral-300 bg-white text-transparent hover:border-neutral-500"
          }`}
          aria-label="완료 토글"
        >
          ✓
        </button>
      </form>
      <span className={`flex-1 text-sm ${t.done ? "text-neutral-400 line-through" : ""}`}>
        {t.title}
      </span>
      {t.dueDate && (
        <span className="text-xs tabular-nums text-neutral-400">{fmtDate(t.dueDate)}</span>
      )}
      {!t.done && <DdayBadge label={t.ddayLabel} />}
      <button
        type="button"
        className="cursor-pointer text-xs text-neutral-300 hover:text-neutral-600"
        onClick={() => setEditing(true)}
      >
        편집
      </button>
      <form action={deleteAction}>
        <button
          className="unstyled cursor-pointer text-xs text-neutral-300 hover:text-red-500"
          onClick={(e) => {
            if (!window.confirm(`'${t.title}' 할 일을 삭제할까요?`)) e.preventDefault();
          }}
        >
          삭제
        </button>
      </form>
    </li>
  );
}
