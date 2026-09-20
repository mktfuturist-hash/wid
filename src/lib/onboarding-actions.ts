"use server";

import { revalidatePath } from "next/cache";
import Anthropic from "@anthropic-ai/sdk";
import { eq } from "drizzle-orm";
import { db, areas, goals, milestones, routines, tasks } from "@/db";
import { requireUserId } from "@/lib/session";
import { addDays, todayStr } from "@/lib/dates";
import type { StarterPlan } from "@/lib/starter-templates";

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/* 클라이언트가 보낸 계획(템플릿 또는 AI 생성)을 검증·정제한다 - 신뢰하지 않는다 */
function sanitize(raw: StarterPlan): StarterPlan {
  const s = (v: unknown, max: number) => String(v ?? "").trim().slice(0, max);
  const yearEnd = `${todayStr().slice(0, 4)}-12-31`;
  return {
    areaName: s(raw.areaName, 30) || "내 목표",
    areaIcon: s(raw.areaIcon, 4) || "🎯",
    pillar: ["work", "life", "money"].includes(raw.pillar) ? raw.pillar : "life",
    guideline: s(raw.guideline, 80),
    goalTitle: s(raw.goalTitle, 60) || "올해 목표",
    metricType: raw.metricType === "routine_count" ? "routine_count" : "milestone",
    metricTarget:
      typeof raw.metricTarget === "number" && raw.metricTarget > 0
        ? Math.min(Math.round(raw.metricTarget), 1000)
        : undefined,
    milestones: (Array.isArray(raw.milestones) ? raw.milestones : [])
      .map((m) => ({
        title: s(m?.title, 60),
        dueDate: DATE_RE.test(String(m?.dueDate)) ? m.dueDate : yearEnd,
      }))
      .filter((m) => m.title)
      .slice(0, 5),
    routines: (Array.isArray(raw.routines) ? raw.routines : [])
      .map((r) => s(r, 40))
      .filter(Boolean)
      .slice(0, 3),
    firstTask: s(raw.firstTask, 60),
  };
}

/* 시작 위저드: 영역→세부 목표→중간 목표→루틴→오늘 할 일을 한 번에 만든다.
   완료 후 클라이언트가 오늘의 루틴으로 보내 첫 체크(aha moment)로 착지시킨다. */
export async function applyStarterPlan(raw: StarterPlan): Promise<{ ok: true }> {
  const uid = await requireUserId();
  const plan = sanitize(raw);
  const today = todayStr();
  const yearEnd = `${today.slice(0, 4)}-12-31`;

  // 이미 영역이 있는 계정이면 중복 생성하지 않는다 (더블 클릭·뒤로가기 방어)
  const existing = await db.select({ id: areas.id }).from(areas).where(eq(areas.userId, uid)).limit(1);
  if (existing.length > 0) return { ok: true };

  const [area] = await db
    .insert(areas)
    .values({
      userId: uid,
      name: plan.areaName,
      icon: plan.areaIcon,
      pillar: plan.pillar,
      guideline: plan.guideline || null,
    })
    .returning({ id: areas.id });

  const [goal] = await db
    .insert(goals)
    .values({
      userId: uid,
      areaId: area.id,
      title: plan.goalTitle,
      dueDate: yearEnd,
      metricType: plan.metricType,
      metricTarget: plan.metricType === "routine_count" ? (plan.metricTarget ?? 50) : null,
    })
    .returning({ id: goals.id });

  if (plan.milestones.length > 0) {
    await db.insert(milestones).values(
      plan.milestones.map((m) => ({
        userId: uid,
        goalId: goal.id,
        title: m.title,
        dueDate: m.dueDate,
      }))
    );
  }

  if (plan.routines.length > 0) {
    await db.insert(routines).values(
      plan.routines.map((title) => ({
        userId: uid,
        goalId: goal.id,
        areaId: area.id,
        title,
      }))
    );
  }

  if (plan.firstTask) {
    await db.insert(tasks).values({ userId: uid, title: plan.firstTask, dueDate: today });
  }

  revalidatePath("/");
  revalidatePath("/routines");
  return { ok: true };
}

export type GeneratePlanResult = { ok: true; plan: StarterPlan } | { ok: false; error: string };

/* "올해 이루고 싶은 것 한 줄" → AI가 목표 세트 초안을 짠다. 저장은 확인 후 applyStarterPlan으로. */
export async function generateStarterPlan(oneLiner: string): Promise<GeneratePlanResult> {
  await requireUserId();
  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "AI 기능이 아직 설정되지 않았습니다." };
  }
  const wish = String(oneLiner ?? "").trim().slice(0, 200);
  if (wish.length < 2) return { ok: false, error: "이루고 싶은 것을 한 줄로 적어 주세요." };

  const today = todayStr();
  const client = new Anthropic();
  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 1500,
      system:
        "너는 개인 목표 설계 코치다. 사용자가 올해 이루고 싶은 것을 한 줄로 말하면, " +
        "목표 관리 앱에 넣을 실행 계획 세트를 짠다.\n" +
        `오늘은 ${today} (KST). 기한은 올해 12월 31일을 넘지 않는다.\n` +
        "반드시 아래 JSON만 출력하라. 설명·마크다운 금지.\n" +
        "{\n" +
        '"areaName":"영역 이름 (10자 이내, 예: 건강)",\n' +
        '"areaIcon":"이모지 1개",\n' +
        '"pillar":"work|life|money 중 하나",\n' +
        '"guideline":"이 영역에서 되고 싶은 모습 한 줄 (40자 이내)",\n' +
        '"goalTitle":"측정 가능한 올해 목표 한 줄 (30자 이내, 숫자 포함 권장)",\n' +
        '"metricType":"milestone 또는 routine_count",\n' +
        '"metricTarget":루틴 횟수 목표(routine_count일 때만, 숫자),\n' +
        '"milestones":[{"title":"중간 체크포인트 (25자 이내)","dueDate":"YYYY-MM-DD"}] (milestone이면 3개, routine_count면 빈 배열),\n' +
        '"routines":["매일 반복할 행동 (20자 이내)"] (정확히 2개, 부담 없이 시작할 수 있게 작게),\n' +
        '"firstTask":"오늘 당장 할 수 있는 첫 행동 (25자 이내)"\n' +
        "}\n" +
        "꾸준함이 핵심인 목표(운동·습관)는 routine_count, 산출물·단계가 있는 목표는 milestone을 골라라. " +
        "말투는 담백한 한국어. 사용자의 표현을 최대한 살려라.",
      messages: [{ role: "user", content: `올해 이루고 싶은 것: ${wish}` }],
    });
    if (response.stop_reason === "refusal") {
      return { ok: false, error: "이 내용으로는 계획을 만들 수 없어요. 다르게 적어 주세요." };
    }
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return { ok: false, error: "계획 생성에 실패했어요. 다시 시도해 주세요." };
    const plan = sanitize(JSON.parse(text.slice(start, end + 1)) as StarterPlan);
    // milestone 방식인데 중간 목표가 비면 기본 3단계를 깔아준다
    if (plan.metricType === "milestone" && plan.milestones.length === 0) {
      plan.milestones = [
        { title: "첫 발 떼기", dueDate: addDays(today, 21) },
        { title: "중간 점검", dueDate: addDays(today, 60) },
        { title: "목표 달성", dueDate: `${today.slice(0, 4)}-12-31` },
      ];
    }
    return { ok: true, plan };
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      return { ok: false, error: "AI 호출에 실패했어요. 잠시 후 다시 시도해 주세요." };
    }
    throw error;
  }
}
