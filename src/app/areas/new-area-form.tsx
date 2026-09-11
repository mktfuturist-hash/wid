"use client";

import { useState } from "react";
import { FieldLabel } from "@/components/ui";

/* 분류(Work·Life·Money)를 고르면 이름·가이드라인 예시가 그 분류에 맞게 바뀐다 */
const EXAMPLES = {
  work: {
    name: "영역 이름 (예: 커리어)",
    guide: "예: AI를 자유롭게 다루는 데이터 기반 마케팅 전문가",
  },
  life: {
    name: "영역 이름 (예: 건강)",
    guide: "예: 신체 나이는 실제보다 젊게, 몸과 마음이 건강한 삶",
  },
  money: {
    name: "영역 이름 (예: 재테크)",
    guide: "예: 노후 걱정 없이, 돈이 일하는 시스템 만들기",
  },
} as const;

export function NewAreaForm({ action }: { action: (fd: FormData) => Promise<void> }) {
  const [pillar, setPillar] = useState<keyof typeof EXAMPLES>("life");
  return (
    <form action={action} className="flex flex-wrap items-end gap-2">
      <label>
        <FieldLabel>분류</FieldLabel>
        <select
          name="pillar"
          value={pillar}
          onChange={(e) => setPillar(e.target.value as keyof typeof EXAMPLES)}
        >
          <option value="work">Work</option>
          <option value="life">Life</option>
          <option value="money">Money</option>
        </select>
      </label>
      <label>
        <FieldLabel>영역 이름</FieldLabel>
        <input name="name" placeholder={EXAMPLES[pillar].name} required className="w-52" />
      </label>
      <label className="min-w-60 flex-1">
        <FieldLabel>가이드라인 - 이 영역에서 나는 어떤 사람이 되고 싶은가</FieldLabel>
        <input name="guideline" placeholder={EXAMPLES[pillar].guide} className="w-full" />
      </label>
      <button type="submit">추가</button>
    </form>
  );
}
