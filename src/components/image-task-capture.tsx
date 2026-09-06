"use client";

import { useRef, useState, useTransition } from "react";
import { parseTasksFromImage, type ParsedTask } from "@/lib/ai-actions";
import { createTasksBulk } from "@/lib/actions";
import { Card, FieldLabel } from "@/components/ui";

type ProjectOpt = { id: number; title: string };
type Row = ParsedTask & { checked: boolean };

/* 📷 이미지로 할 일 추출 — 스크린샷을 올리면 AI가 항목·날짜를 뽑고,
   확인·수정 후 한 번에 등록한다 */
export function ImageTaskCapture({ projects }: { projects: ProjectOpt[] }) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[] | null>(null);
  const [projectId, setProjectId] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [doneMsg, setDoneMsg] = useState<string | null>(null);
  const [parsing, startParsing] = useTransition();
  const [saving, startSaving] = useTransition();

  const reset = () => {
    setRows(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const onPick = (file: File | null) => {
    if (!file) return;
    setError(null);
    setDoneMsg(null);
    const fd = new FormData();
    fd.set("image", file);
    startParsing(async () => {
      const result = await parseTasksFromImage(fd);
      if (!result.ok) {
        setError(result.error);
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      if (result.tasks.length === 0) {
        setError("이미지에서 할 일을 찾지 못했어요. 다른 이미지로 시도해 보세요.");
        if (fileRef.current) fileRef.current.value = "";
        return;
      }
      setRows(result.tasks.map((t) => ({ ...t, checked: true })));
    });
  };

  const save = () => {
    if (!rows) return;
    const picked = rows.filter((r) => r.checked && r.title.trim());
    if (picked.length === 0) return;
    startSaving(async () => {
      await createTasksBulk(
        picked.map(({ title, dueDate }) => ({ title, dueDate })),
        projectId ? Number(projectId) : null
      );
      setDoneMsg(`✅ ${picked.length}개 할 일을 등록했어요.`);
      reset();
    });
  };

  return (
    <Card>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-neutral-500">📷 이미지로 할 일 추출</h2>
          <p className="mt-0.5 text-xs text-neutral-400">
            일정표·커리큘럼·메모 스크린샷을 올리면 AI가 할 일과 날짜를 뽑아줘요.
          </p>
        </div>
        <label className="btn-ghost cursor-pointer">
          {parsing ? "분석 중…" : "이미지 선택"}
          <input
            ref={fileRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            disabled={parsing}
            onChange={(e) => onPick(e.target.files?.[0] ?? null)}
          />
        </label>
      </div>

      {parsing && <p className="mt-3 text-sm text-neutral-400">🤖 이미지를 읽는 중입니다… (몇 초 걸려요)</p>}
      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
      {doneMsg && !rows && <p className="mt-3 text-sm text-emerald-600">{doneMsg}</p>}

      {rows && (
        <div className="mt-4 space-y-3 border-t border-neutral-100 pt-3">
          <p className="text-xs text-neutral-400">
            추출된 {rows.length}개 — 체크된 항목만 등록됩니다. 제목·날짜는 바로 수정할 수 있어요.
          </p>
          <ul className="space-y-1.5">
            {rows.map((r, i) => (
              <li key={i} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={r.checked}
                  onChange={(e) =>
                    setRows(rows.map((x, j) => (j === i ? { ...x, checked: e.target.checked } : x)))
                  }
                  className="h-4 w-4"
                />
                <input
                  value={r.title}
                  onChange={(e) =>
                    setRows(rows.map((x, j) => (j === i ? { ...x, title: e.target.value } : x)))
                  }
                  className="min-w-40 flex-1"
                />
                <input
                  type="date"
                  value={r.dueDate ?? ""}
                  onChange={(e) =>
                    setRows(rows.map((x, j) => (j === i ? { ...x, dueDate: e.target.value || null } : x)))
                  }
                />
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-end gap-2">
            <label>
              <FieldLabel>붙일 프로젝트</FieldLabel>
              <select value={projectId} onChange={(e) => setProjectId(e.target.value)}>
                <option value="">프로젝트 없음 (인박스/기한별)</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>{p.title}</option>
                ))}
              </select>
            </label>
            <button type="button" className="btn" onClick={save} disabled={saving}>
              {saving ? "등록 중…" : `${rows.filter((r) => r.checked).length}개 등록`}
            </button>
            <button type="button" className="btn-ghost" onClick={reset} disabled={saving}>
              취소
            </button>
          </div>
        </div>
      )}
    </Card>
  );
}
