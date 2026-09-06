"use client";

import { useState } from "react";
import { Card } from "@/components/ui";

/* 마크다운 라이트 렌더 — ##제목·리스트만 예쁘게, 나머지는 그대로 */
function MdView({ text }: { text: string }) {
  return (
    <div className="min-h-40 space-y-1 text-sm leading-relaxed">
      {text.split("\n").map((line, i) => {
        const t = line.trim();
        if (!t) return <div key={i} className="h-2" />;
        if (t.startsWith("## "))
          return <p key={i} className="mt-2 font-bold text-neutral-800">{t.slice(3)}</p>;
        if (t.startsWith("# "))
          return <p key={i} className="mt-2 text-base font-bold text-neutral-900">{t.slice(2)}</p>;
        if (/^[-*]\s/.test(t))
          return (
            <p key={i} className="flex gap-2 text-neutral-700">
              <span className="text-neutral-400">•</span>
              <span>{t.slice(2)}</span>
            </p>
          );
        return <p key={i} className="text-neutral-700">{line}</p>;
      })}
    </div>
  );
}

const EDIT_BTN =
  "cursor-pointer rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100";

/* 계획·회고 — 작성 완료된 칸은 읽기 화면으로, 편집을 눌러야 입력창이 열린다 */
export function ReviewEditor({
  planMd,
  retroMd,
  updateAction,
  deleteAction,
}: {
  planMd: string;
  retroMd: string;
  updateAction: (fd: FormData) => Promise<void>;
  deleteAction: () => Promise<void>;
}) {
  // 내용이 비어 있으면 처음부터 입력 모드
  const [editPlan, setEditPlan] = useState(planMd.trim() === "");
  const [editRetro, setEditRetro] = useState(retroMd.trim() === "");
  const editing = editPlan || editRetro;

  return (
    <form
      action={async (fd) => {
        await updateAction(fd);
        setEditPlan(false);
        setEditRetro(false);
      }}
    >
      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-blue-600">📋 계획</h2>
            {!editPlan && (
              <button type="button" className={EDIT_BTN} onClick={() => setEditPlan(true)}>
                편집
              </button>
            )}
          </div>
          {editPlan ? (
            <textarea
              name="planMd"
              defaultValue={planMd}
              rows={18}
              className="w-full font-mono text-sm leading-relaxed"
            />
          ) : (
            <>
              {/* 저장 시 다른 칸 내용이 지워지지 않게 원본을 함께 제출 */}
              <input type="hidden" name="planMd" value={planMd} />
              <MdView text={planMd} />
            </>
          )}
        </Card>
        <Card>
          <div className="mb-2 flex items-center justify-between">
            <h2 className="text-sm font-semibold text-emerald-600">🪞 회고</h2>
            {!editRetro && (
              <button type="button" className={EDIT_BTN} onClick={() => setEditRetro(true)}>
                편집
              </button>
            )}
          </div>
          {editRetro ? (
            <textarea
              name="retroMd"
              defaultValue={retroMd}
              rows={18}
              className="w-full font-mono text-sm leading-relaxed"
            />
          ) : (
            <>
              <input type="hidden" name="retroMd" value={retroMd} />
              <MdView text={retroMd} />
            </>
          )}
        </Card>
      </div>
      <div className="mt-4 flex items-center gap-2">
        {editing && <button type="submit">저장</button>}
        <button
          formAction={deleteAction}
          className="ml-auto text-xs text-neutral-400 hover:text-red-500"
          onClick={(e) => {
            if (!window.confirm("이 계획·회고를 삭제할까요?")) e.preventDefault();
          }}
        >
          삭제
        </button>
      </div>
    </form>
  );
}
