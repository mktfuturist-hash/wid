import type { ReactNode } from "react";
import { fmtDate, fmtDateShort } from "@/lib/dates";

/** 날짜 표기 — 모바일에선 9/6, sm 이상에선 2026.09.06 */
export function SmartDate({ date }: { date: string | null }) {
  if (!date) return null;
  return (
    <>
      <span className="sm:hidden">{fmtDateShort(date)}</span>
      <span className="hidden sm:inline">{fmtDate(date)}</span>
    </>
  );
}

export const PILLARS = {
  work: { label: "Work", icon: "💼", color: "text-work-ink", bar: "bg-work", chip: "bg-work-tint text-work-ink border-work-line" },
  life: { label: "Life", icon: "🌱", color: "text-life-ink", bar: "bg-life", chip: "bg-life-tint text-life-ink border-life-line" },
  money: { label: "Money", icon: "💰", color: "text-money-ink", bar: "bg-money", chip: "bg-money-tint text-money-ink border-money-line" },
} as const;

export type Pillar = keyof typeof PILLARS;

export function PillarChip({ pillar }: { pillar: Pillar }) {
  const p = PILLARS[pillar];
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${p.chip}`}>
      {p.icon} {p.label}
    </span>
  );
}

/* 특정 영역(예: 💼 커리어)을 분류 컬러 알약으로 표시 — 목표·프로젝트 카드용 */
export function AreaChip({
  icon,
  name,
  pillar,
}: {
  icon?: string | null;
  name: string;
  pillar: Pillar;
}) {
  const p = PILLARS[pillar];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium ${p.chip}`}>
      {icon ?? p.icon} {name}
    </span>
  );
}

export function ProgressBar({
  value,
  pillar = "life",
}: {
  value: number | null;
  pillar?: Pillar;
}) {
  return (
    <div className="flex items-center gap-2">
      <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200">
        {value != null && (
          <div
            className={`h-full rounded-full ${PILLARS[pillar].bar} transition-all`}
            style={{ width: `${Math.round(value * 100)}%` }}
          />
        )}
      </div>
      <span className="w-10 text-right text-xs tabular-nums text-neutral-500">
        {value != null ? `${Math.round(value * 100)}%` : "—"}
      </span>
    </div>
  );
}

/* 영역(일·삶·돈) 구분용 왼쪽 컬러 띠 — Card에 pillar를 넘기면 붙는다 */
const PILLAR_EDGE: Record<Pillar, string> = {
  work: "border-l-4 border-l-work",
  life: "border-l-4 border-l-life",
  money: "border-l-4 border-l-money",
};

export function Card({
  children,
  className = "",
  pillar,
}: {
  children: ReactNode;
  className?: string;
  pillar?: Pillar | null;
}) {
  return (
    <div className={`rounded-xl border border-neutral-200 bg-white p-4 shadow-sm ${pillar ? PILLAR_EDGE[pillar] : ""} ${className}`}>
      {children}
    </div>
  );
}

/* 리스트 행 등 작은 자리에서 영역을 표시하는 색 점 */
export function PillarDot({ pillar }: { pillar?: Pillar | null }) {
  if (!pillar) return null;
  return <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${PILLARS[pillar].bar}`} />;
}

/* 입력 폼 필드 위 회색 안내 라벨 */
export function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="mb-1 block text-xs text-neutral-400">{children}</span>;
}

export function SectionTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-sm font-semibold text-neutral-500">{children}</h2>;
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="rounded-lg border border-dashed border-neutral-300 p-6 text-center text-sm text-neutral-400">
      {children}
    </p>
  );
}

export function DdayBadge({ label }: { label: string }) {
  if (!label) return null;
  const urgent = label === "D-day" || label.startsWith("D+");
  return (
    <span
      className={`rounded-md px-1.5 py-0.5 text-xs font-semibold tabular-nums ${
        label === "완료"
          ? "bg-neutral-100 text-neutral-500"
          : urgent
            ? "bg-red-50 text-red-600"
            : "bg-neutral-100 text-neutral-600"
      }`}
    >
      {label}
    </span>
  );
}
