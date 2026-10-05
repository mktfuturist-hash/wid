"use client";

import { useOptimistic, useState, useTransition } from "react";
import { SmartDate } from "@/components/ui";

type Milestone = {
  id: number;
  title: string;
  dueDate: string | null;
  done: boolean;
};

/* 중간 목표 한 줄 - 오른쪽 편집/삭제 버튼, 편집 시 이름·날짜 그 자리에서 수정 */
export function MilestoneRow({
  milestone: m,
  toggleAction,
  updateAction,
  deleteAction,
}: {
  milestone: Milestone;
  toggleAction: () => Promise<void>;
  updateAction: (fd: FormData) => Promise<void>;
  deleteAction: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  // 낙관적 완료 표시 - 서버 왕복을 기다리지 않고 줄 전체(체크·취소선)가 즉시 바뀐다
  const [optDone, setOptDone] = useOptimistic(m.done);
  const [, startToggle] = useTransition();

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
          <input name="title" defaultValue={m.title} required className="min-w-40 flex-1" />
          <input type="date" name="dueDate" defaultValue={m.dueDate ?? ""} />
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
      <button
        type="button"
        onClick={() =>
          startToggle(async () => {
            setOptDone(!optDone);
            await toggleAction();
          })
        }
        className={`unstyled flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border text-xs ${
          optDone
            ? "border-neutral-900 bg-neutral-900 text-white"
            : "border-neutral-300 bg-white text-transparent hover:border-neutral-500"
        }`}
        aria-label="완료 토글"
      >
        ✓
      </button>
      <span className={`min-w-0 flex-1 text-sm ${optDone ? "text-neutral-400 line-through" : ""}`}>
        {m.title}
      </span>
      {m.dueDate && (
        <span className="text-xs tabular-nums text-neutral-400"><SmartDate date={m.dueDate} /></span>
      )}
      <button
        type="button"
        className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
        onClick={() => setEditing(true)}
        aria-label="편집"
      >
        <span className="sm:hidden">✏️</span>
        <span className="hidden sm:inline">편집</span>
      </button>
      <form action={deleteAction}>
        <button
          className="unstyled cursor-pointer rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-600 hover:border-red-200 hover:bg-red-50 hover:text-red-600"
          onClick={(e) => {
            if (!window.confirm(`'${m.title}' 중간 목표를 삭제할까요?`)) e.preventDefault();
          }}
          aria-label="삭제"
        >
          <span className="sm:hidden">✕</span>
          <span className="hidden sm:inline">삭제</span>
        </button>
      </form>
    </li>
  );
}
