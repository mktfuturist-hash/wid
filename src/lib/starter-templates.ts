import { addDays, todayStr } from "@/lib/dates";

/* 시작 위저드가 한 번에 만들어 주는 목표 세트.
   서버 액션(applyStarterPlan)이 이 형태를 받아 영역→세부 목표→중간 목표→루틴→할 일을 생성한다. */
export type StarterPlan = {
  areaName: string;
  areaIcon: string;
  pillar: "work" | "life" | "money";
  guideline: string;
  goalTitle: string;
  /** milestone = 중간 목표 체크로 진척, routine_count = 루틴 실행 횟수로 진척 */
  metricType: "milestone" | "routine_count";
  /** routine_count일 때 목표 횟수 */
  metricTarget?: number;
  milestones: { title: string; dueDate: string }[];
  routines: string[];
  firstTask: string;
};

export type TemplateKey = "ai" | "diet" | "reading";

/* 랜딩에서 검증된 3가지 관심사 - 날짜는 오늘 기준으로 계산 */
export function starterTemplates(): Record<TemplateKey, StarterPlan & { label: string; emoji: string; tagline: string }> {
  const t = todayStr();
  const yearEnd = `${t.slice(0, 4)}-12-31`;
  return {
    ai: {
      label: "AI 학습",
      emoji: "🤖",
      tagline: "AI로 결과물 3개 만들기",
      areaName: "AI 학습",
      areaIcon: "🤖",
      pillar: "work",
      guideline: "AI를 도구로 자유롭게 부리는 사람",
      goalTitle: "연말까지 AI로 결과물 3개 만들기",
      metricType: "milestone",
      milestones: [
        { title: "첫 번째 결과물 완성 (작아도 OK)", dueDate: addDays(t, 30) },
        { title: "두 번째 결과물 - 남에게 공유해 보기", dueDate: addDays(t, 60) },
        { title: "세 번째 결과물 - 내 무기로 정리", dueDate: yearEnd },
      ],
      routines: ["AI 도구 30분 만져보기", "배운 것 한 줄 기록하기"],
      firstTask: "AI로 만들고 싶은 것 1개 적어보기",
    },
    diet: {
      label: "다이어트",
      emoji: "🏃",
      tagline: "운동 습관 50회 쌓기",
      areaName: "건강",
      areaIcon: "🏃",
      pillar: "life",
      guideline: "가볍고 에너지 넘치는 몸",
      goalTitle: "연말까지 운동 50회 쌓기",
      metricType: "routine_count",
      metricTarget: 50,
      milestones: [],
      routines: ["30분 운동·산책하기", "저녁에 체중 기록하기"],
      firstTask: "운동화·운동복 꺼내서 잘 보이는 곳에 두기",
    },
    reading: {
      label: "책 읽기",
      emoji: "📚",
      tagline: "연말까지 책 4권",
      areaName: "성장",
      areaIcon: "📚",
      pillar: "life",
      guideline: "매일 조금씩, 읽는 사람",
      goalTitle: "연말까지 책 4권 읽기",
      metricType: "milestone",
      milestones: [
        { title: "1권째 완독", dueDate: addDays(t, 25) },
        { title: "2권째 완독", dueDate: addDays(t, 55) },
        { title: "3권째 완독", dueDate: addDays(t, 85) },
        { title: "4권째 완독", dueDate: yearEnd },
      ],
      routines: ["자기 전 15분 읽기", "이동 시간에 전자책·오디오북 10분"],
      firstTask: "읽을 첫 번째 책 고르기",
    },
  };
}
