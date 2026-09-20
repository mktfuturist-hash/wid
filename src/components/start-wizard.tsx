"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { starterTemplates, type StarterPlan, type TemplateKey } from "@/lib/starter-templates";
import { applyStarterPlan, generateStarterPlan } from "@/lib/onboarding-actions";
import { track } from "@/lib/analytics";
import { fmtDate } from "@/lib/dates";

type Pick = TemplateKey | "custom" | null;

/* 가입 직후 시작 위저드 - 읽는 온보딩 대신 탭 한 번으로 목표 세트를 만들어 준다.
   목표: 가입 → 첫 루틴 체크까지 3분. */
export function StartWizard() {
  const templates = useMemo(() => starterTemplates(), []);
  const [picked, setPicked] = useState<Pick>(null);
  const [wish, setWish] = useState("");
  const [aiPlan, setAiPlan] = useState<StarterPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [generating, startGenerating] = useTransition();
  const [applying, startApplying] = useTransition();

  const plan: StarterPlan | null =
    picked === "custom" ? aiPlan : picked ? templates[picked] : null;

  const generate = () => {
    setError(null);
    startGenerating(async () => {
      const res = await generateStarterPlan(wish);
      if (res.ok) {
        setAiPlan(res.plan);
        track("onboarding_ai_generate", {});
      } else {
        setError(res.error);
      }
    });
  };

  const apply = () => {
    if (!plan) return;
    setError(null);
    track("onboarding_complete", { template: picked === "custom" ? "ai_custom" : picked! });
    startApplying(async () => {
      await applyStarterPlan(plan);
      // 서버 redirect는 revalidate와 겹치면 씹히는 경우가 있어 클라이언트에서 확실하게 이동한다
      window.location.assign("/routines?welcome=1");
    });
  };

  return (
    <div className="rounded-2xl border border-blue-200 bg-gradient-to-br from-blue-50 via-white to-emerald-50 p-5 sm:p-7">
      <h2 className="text-xl font-bold">👋 3분이면 시작할 수 있어요</h2>
      <p className="mt-1 text-sm text-neutral-600">
        올해 뭘 이루고 싶으세요? 하나 고르면 <b>목표·루틴·오늘 할 일까지 한 번에</b> 만들어 드려요.
        만든 뒤에 얼마든지 고칠 수 있습니다.
      </p>

      {/* 1단계: 관심사 고르기 */}
      <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4">
        {(Object.keys(templates) as TemplateKey[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => { setPicked(k); setError(null); }}
            className={`cursor-pointer rounded-xl border-2 p-3 text-left transition ${
              picked === k
                ? "border-brand bg-white shadow-md"
                : "border-neutral-200 bg-white/70 hover:border-neutral-400"
            }`}
          >
            <div className="text-2xl">{templates[k].emoji}</div>
            <div className="mt-1 text-sm font-bold">{templates[k].label}</div>
            <div className="text-xs text-neutral-400">{templates[k].tagline}</div>
          </button>
        ))}
        <button
          type="button"
          onClick={() => { setPicked("custom"); setError(null); }}
          className={`cursor-pointer rounded-xl border-2 p-3 text-left transition ${
            picked === "custom"
              ? "border-brand bg-white shadow-md"
              : "border-dashed border-neutral-300 bg-white/70 hover:border-neutral-400"
          }`}
        >
          <div className="text-2xl">✨</div>
          <div className="mt-1 text-sm font-bold">직접 쓸래요</div>
          <div className="text-xs text-neutral-400">한 줄이면 AI가 계획을 짜요</div>
        </button>
      </div>

      {/* 직접 입력(AI) */}
      {picked === "custom" && (
        <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <label className="text-xs font-semibold text-neutral-500">올해 이루고 싶은 것 한 줄</label>
          <div className="mt-1.5 flex flex-wrap gap-2">
            <input
              value={wish}
              onChange={(e) => setWish(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter" && !generating) generate(); }}
              placeholder="예: 내년 상반기 이직 준비, 매일 글쓰기 습관…"
              className="min-w-52 flex-1"
            />
            <button type="button" className="btn" onClick={generate} disabled={generating}>
              {generating ? "🤖 계획 짜는 중…" : aiPlan ? "다시 만들기" : "AI에게 계획 받기"}
            </button>
          </div>
        </div>
      )}

      {/* 2단계: 만들어질 것 미리보기 */}
      {plan && (
        <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold tracking-wide text-neutral-400">이렇게 만들어 드릴게요</p>
          <ul className="mt-2 space-y-1.5 text-sm">
            <li>🚩 <b>{plan.areaIcon} {plan.areaName}</b> <span className="text-neutral-400">- {plan.guideline}</span></li>
            <li>
              🎯 <b>{plan.goalTitle}</b>{" "}
              <span className="text-neutral-400">
                ({plan.metricType === "routine_count"
                  ? `루틴 ${plan.metricTarget ?? 50}회 채우면 달성 - 체크할 때마다 진척률이 올라요`
                  : "중간 목표를 체크하면 진척률이 올라요"})
              </span>
            </li>
            {plan.milestones.map((m) => (
              <li key={m.title} className="pl-5 text-neutral-600">📍 {m.title} <span className="text-xs text-neutral-400">~{fmtDate(m.dueDate)}</span></li>
            ))}
            {plan.routines.map((r) => (
              <li key={r}>🔁 매일: <b>{r}</b></li>
            ))}
            {plan.firstTask && <li>✅ 오늘 할 일: <b>{plan.firstTask}</b></li>}
          </ul>
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={apply}
              disabled={applying}
              className="cursor-pointer rounded-xl bg-brand px-6 py-2.5 font-bold text-white shadow-md transition hover:bg-[#0086d6] disabled:opacity-60"
            >
              {applying ? "만드는 중…" : "이대로 시작하기 →"}
            </button>
            <span className="text-xs text-neutral-400">시작하면 바로 첫 루틴을 체크할 수 있어요</span>
          </div>
        </div>
      )}

      {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

      <p className="mt-4 text-xs text-neutral-400">
        차근차근 직접 만들고 싶다면 -{" "}
        <Link href="/guide" className="underline hover:text-neutral-600">📖 사용 설명서 보기</Link>
      </p>
    </div>
  );
}
