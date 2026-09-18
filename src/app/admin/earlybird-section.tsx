"use client";

import { useState, useTransition } from "react";
import { Card, SectionTitle } from "@/components/ui";
import type { Earlybird } from "@/lib/earlybird";

function FieldLabel({ children }: { children: React.ReactNode }) {
  return <span className="mb-1 block text-xs text-neutral-400">{children}</span>;
}

/* 얼리버드 설정 — 랜딩의 마감일·정원·가격 문구를 여기서 바꾼다.

   예전에는 landing.tsx 의 상수를 고치고 커밋하고 배포해야 했다.
   마감을 세 번 미루는 동안 배포도 세 번 했다. */
export function EarlybirdSection({
  value,
  saveAction,
  today,
}: {
  value: Earlybird;
  saveAction: (fd: FormData) => Promise<void>;
  today: string;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [deadline, setDeadline] = useState(value.deadline);
  const [capacity, setCapacity] = useState(String(value.capacity));

  const closedByDate = today > deadline;
  const daysLeft = Math.ceil(
    (new Date(deadline + "T00:00:00").getTime() -
      new Date(today + "T00:00:00").getTime()) /
      86400000
  );

  return (
    <Card>
      <SectionTitle>얼리버드 설정</SectionTitle>
      <p className="mb-3 text-sm text-neutral-500">
        랜딩의 <b>마감일 · 정원 · 가격 문구</b>를 여기서 바꿉니다. 저장하면 바로 반영돼요 —
        <b> 배포하지 않아도 됩니다.</b>
      </p>

      <form
        action={(fd) =>
          startTransition(async () => {
            await saveAction(fd);
            setSaved(true);
            setTimeout(() => setSaved(false), 2500);
          })
        }
        className="space-y-3"
      >
        <div className="flex flex-wrap gap-3">
          <label className="min-w-36">
            <FieldLabel>마감일</FieldLabel>
            <input
              type="date"
              name="deadline"
              value={deadline}
              onChange={(e) => setDeadline(e.target.value)}
              required
              className="w-full"
            />
          </label>
          <label className="w-28">
            <FieldLabel>정원 (명)</FieldLabel>
            <input
              type="number"
              name="capacity"
              min={1}
              max={100000}
              value={capacity}
              onChange={(e) => setCapacity(e.target.value)}
              required
              className="w-full"
            />
          </label>
          <label className="min-w-40 flex-1">
            <FieldLabel>정가 (참조점)</FieldLabel>
            <input
              name="priceAnchor"
              defaultValue={value.priceAnchor}
              placeholder="월 4,900원"
              required
              className="w-full"
            />
          </label>
          <label className="min-w-48 flex-1">
            <FieldLabel>지금 값</FieldLabel>
            <input
              name="priceNow"
              defaultValue={value.priceNow}
              placeholder="얼리버드 기간 한정 0원"
              required
              className="w-full"
            />
          </label>
        </div>

        <label className="flex items-center gap-2 text-sm text-neutral-600">
          <input type="checkbox" name="forceClosed" defaultChecked={value.forceClosed} />
          <span>
            지금 바로 마감하기{" "}
            <span className="text-neutral-400">— 마감일 전이라도 정원이 찼을 때</span>
          </span>
        </label>

        <div className="flex items-center gap-3">
          <button type="submit" className="btn" disabled={pending}>
            {pending ? "저장 중…" : "저장"}
          </button>
          {saved && <span className="text-sm font-semibold text-emerald-600">저장했어요 ✓</span>}
        </div>
      </form>

      {/* 저장 전에 랜딩에 뭐라고 뜨는지 그대로 보여준다 */}
      <div className="mt-4 rounded-lg border border-dashed border-neutral-300 p-3">
        <p className="mb-2 text-xs text-neutral-400">랜딩 배지 미리보기</p>
        <span className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-sm font-semibold text-red-600">
          얼리버드 {capacity || "?"}명 한정
          {!value.forceClosed && !closedByDate && daysLeft >= 0 && (
            <span>
              · {Number(deadline.split("-")[1])}/{Number(deadline.split("-")[2])} 마감{" "}
              {daysLeft === 0 ? "D-day" : `D-${daysLeft}`}
            </span>
          )}
        </span>
        {(value.forceClosed || closedByDate) && (
          <p className="mt-2 text-xs text-neutral-500">
            지금은 <b>마감 상태</b>입니다 — CTA 자리에 “얼리버드 모집이 마감됐어요”가 뜹니다.
            {closedByDate && !value.forceClosed && " (마감일이 지났습니다)"}
          </p>
        )}
      </div>
    </Card>
  );
}
