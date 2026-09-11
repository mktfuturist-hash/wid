"use client";

import { useState } from "react";
import { Card, FieldLabel, type Pillar } from "@/components/ui";

type Area = {
  id: number;
  name: string;
  icon: string | null;
  pillar: Pillar;
  guideline: string | null;
};

/* 영역 카드 - 편집 버튼으로 그 자리에서 이름·아이콘·분류·가이드라인 수정 */
export function AreaCard({
  area,
  updateAction,
  archiveAction,
}: {
  area: Area;
  updateAction: (fd: FormData) => Promise<void>;
  archiveAction: () => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <Card pillar={area.pillar}>
        <form
          action={async (fd) => {
            await updateAction(fd);
            setEditing(false);
          }}
          className="space-y-2"
        >
          <div className="flex flex-wrap items-end gap-2">
            <label>
              <FieldLabel>분류</FieldLabel>
              <select name="pillar" defaultValue={area.pillar}>
                <option value="work">Work</option>
                <option value="life">Life</option>
                <option value="money">Money</option>
              </select>
            </label>
            <label>
              <FieldLabel>아이콘</FieldLabel>
              <input name="icon" defaultValue={area.icon ?? ""} className="w-16 text-center" maxLength={4} />
            </label>
            <label className="min-w-32 flex-1">
              <FieldLabel>영역 이름</FieldLabel>
              <input name="name" defaultValue={area.name} required className="w-full" />
            </label>
          </div>
          <label className="block">
            <FieldLabel>가이드라인</FieldLabel>
            <input
              name="guideline"
              defaultValue={area.guideline ?? ""}
              placeholder="이 영역에서 나는 어떤 사람이 되고 싶은가?"
              className="w-full"
            />
          </label>
          <div className="flex gap-2">
            <button type="submit">저장</button>
            <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
              취소
            </button>
          </div>
        </form>
      </Card>
    );
  }

  return (
    <Card pillar={area.pillar} className="flex items-start justify-between gap-2">
      <div>
        <div className="flex items-center gap-2">
          <span className="text-xl">{area.icon}</span>
          <span className="font-semibold">{area.name}</span>
        </div>
        {area.guideline && <p className="mt-1.5 text-sm text-neutral-500">{area.guideline}</p>}
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
          onClick={() => setEditing(true)}
        >
          편집
        </button>
        <form action={archiveAction}>
          <button className="unstyled cursor-pointer rounded-lg px-2 py-1 text-xs text-neutral-400 hover:bg-neutral-100 hover:text-neutral-600">
            보관
          </button>
        </form>
      </div>
    </Card>
  );
}
