"use client";

import { useState } from "react";
import { Card, FieldLabel, SectionTitle } from "@/components/ui";
import { NumberInput } from "@/components/number-input";
import { fmtDate } from "@/lib/dates";

const METRIC_LABEL: Record<string, string> = {
  milestone: "중간 목표 체크",
  manual: "수치 직접 입력",
  routine_count: "루틴 실행 횟수",
  task_rate: "프로젝트 할일 완료율",
  money: "계좌 잔액",
};

const STATUS_LABEL: Record<string, string> = {
  active: "진행 중",
  hold: "보류",
  done: "달성",
};

type GoalData = {
  id: number;
  title: string;
  areaId: number | null;
  dueDate: string | null;
  status: string;
  description: string | null;
  metricType: string;
  metricCurrent: number | null;
  metricTarget: number | null;
  metricStart: number | null;
  metricUnit: string | null;
  moneyAccountId: number | null;
};
type AreaOpt = { id: number; name: string; icon: string | null };
type AcctOpt = { id: number; name: string };

/* 목표 설정 - 평소엔 설정된 값 요약을 보여주고, 편집을 누르면 수정 폼 노출 */
export function GoalSettings({
  goal: g,
  areas,
  accounts,
  updateAction,
}: {
  goal: GoalData;
  areas: AreaOpt[];
  accounts: AcctOpt[];
  updateAction: (fd: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [metricType, setMetricType] = useState(g.metricType);
  const area = areas.find((a) => a.id === g.areaId);
  const acct = accounts.find((a) => a.id === g.moneyAccountId);
  const unit = g.metricUnit ?? "";

  if (!editing) {
    const rows: [string, string][] = [
      ["영역", area ? `${area.icon ?? ""} ${area.name}`.trim() : "없음"],
      ["기한", g.dueDate ? fmtDate(g.dueDate) : "없음"],
      ["상태", STATUS_LABEL[g.status] ?? g.status],
      ["진척 측정 방식", METRIC_LABEL[g.metricType] ?? g.metricType],
    ];
    if (g.metricType !== "milestone" && g.metricType !== "task_rate") {
      if (g.metricStart != null) {
        rows.push([
          "시작 → 목표",
          `${g.metricStart.toLocaleString()}${unit} → ${g.metricTarget?.toLocaleString() ?? "—"}${unit}`,
        ]);
        rows.push(["현재값", `${g.metricCurrent?.toLocaleString() ?? "—"}${unit}`]);
      } else {
        rows.push([
          "현재값 / 목표값",
          `${g.metricCurrent?.toLocaleString() ?? "—"}${unit} / ${g.metricTarget?.toLocaleString() ?? "—"}${unit}`,
        ]);
      }
    }
    if (g.metricType === "money") {
      rows.push(["연결 계좌", acct?.name ?? "없음"]);
    }
    return (
      <Card>
        <div className="flex items-center justify-between">
          <SectionTitle>목표 설정</SectionTitle>
          <button
            type="button"
            className="cursor-pointer rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100"
            onClick={() => {
              setMetricType(g.metricType);
              setEditing(true);
            }}
          >
            편집
          </button>
        </div>
        {g.description && <p className="mb-3 text-sm text-neutral-600">{g.description}</p>}
        <dl className="grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          {rows.map(([k, v]) => (
            <div key={k} className="flex items-baseline justify-between gap-3 border-b border-neutral-100 pb-1.5">
              <dt className="shrink-0 text-xs text-neutral-400">{k}</dt>
              <dd className="text-right font-medium text-neutral-700">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>
    );
  }

  return (
    <Card>
      <SectionTitle>목표 설정 편집</SectionTitle>
      <form
        action={async (fd) => {
          await updateAction(fd);
          setEditing(false);
        }}
        className="grid gap-3 sm:grid-cols-2"
      >
        <label className="text-sm">
          <FieldLabel>제목</FieldLabel>
          <input name="title" defaultValue={g.title} required className="w-full" />
        </label>
        <label className="text-sm">
          <FieldLabel>영역</FieldLabel>
          <select name="areaId" defaultValue={g.areaId ?? ""} className="w-full">
            <option value="">없음</option>
            {areas.map((a) => (
              <option key={a.id} value={a.id}>{a.icon} {a.name}</option>
            ))}
          </select>
        </label>
        <label className="text-sm">
          <FieldLabel>기한</FieldLabel>
          <input type="date" name="dueDate" defaultValue={g.dueDate ?? ""} className="w-full" />
        </label>
        <label className="text-sm">
          <FieldLabel>상태</FieldLabel>
          <select name="status" defaultValue={g.status} className="w-full">
            <option value="active">진행 중</option>
            <option value="hold">보류</option>
            <option value="done">달성</option>
          </select>
        </label>
        <label className="text-sm sm:col-span-2">
          <FieldLabel>설명</FieldLabel>
          <input name="description" defaultValue={g.description ?? ""} className="w-full" placeholder="이 목표에 대한 간단한 설명" />
        </label>
        <label className="text-sm">
          <FieldLabel>진척 측정 방식</FieldLabel>
          <select
            name="metricType"
            value={metricType}
            onChange={(e) => setMetricType(e.target.value)}
            className="w-full"
          >
            {Object.entries(METRIC_LABEL).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <div className="grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
          <label>
            <FieldLabel>시작값</FieldLabel>
            <NumberInput name="metricStart" defaultValue={g.metricStart} className="w-full" placeholder="예: 56" />
          </label>
          <label>
            <FieldLabel>현재값</FieldLabel>
            <NumberInput name="metricCurrent" defaultValue={g.metricCurrent} className="w-full" />
          </label>
          <label>
            <FieldLabel>목표값</FieldLabel>
            <NumberInput name="metricTarget" defaultValue={g.metricTarget} className="w-full" />
          </label>
          <label>
            <FieldLabel>단위</FieldLabel>
            <input name="metricUnit" defaultValue={g.metricUnit ?? ""} className="w-full" placeholder="kg, 회, 원…" />
          </label>
        </div>
        {metricType === "manual" && (
          <p className="-mt-1 text-xs text-neutral-400 sm:col-span-2">
            줄어드는 목표(감량 등)는 시작값을 넣으면 (현재−시작)÷(목표−시작)으로 진척률이 계산됩니다.
            시작값이 없으면 현재값÷목표값으로 계산해요.
          </p>
        )}
        {metricType === "money" && (
          <label className="text-sm">
            <FieldLabel>연결 계좌</FieldLabel>
            <select name="moneyAccountId" defaultValue={g.moneyAccountId ?? ""} className="w-full">
              <option value="">없음</option>
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </label>
        )}
        <div className="flex items-end gap-2 sm:col-span-2">
          <button type="submit">저장</button>
          <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>
            취소
          </button>
        </div>
      </form>
    </Card>
  );
}
