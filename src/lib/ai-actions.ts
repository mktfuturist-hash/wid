"use server";

import Anthropic from "@anthropic-ai/sdk";
import { requireUserId } from "@/lib/session";
import { todayStr } from "@/lib/dates";

export type ParsedTask = { title: string; dueDate: string | null };
export type ParseResult =
  | { ok: true; tasks: ParsedTask[] }
  | { ok: false; error: string };

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp", "image/gif"] as const;
const MAX_BYTES = 6 * 1024 * 1024;

/* 이미지(일정표·커리큘럼·메모 스크린샷)에서 할 일 후보를 추출한다.
   결과는 바로 저장하지 않고 클라이언트에서 확인·수정 후 등록한다. */
export async function parseTasksFromImage(fd: FormData): Promise<ParseResult> {
  await requireUserId();

  if (!process.env.ANTHROPIC_API_KEY) {
    return { ok: false, error: "AI 기능이 아직 설정되지 않았습니다 (ANTHROPIC_API_KEY 미등록)." };
  }

  const file = fd.get("image");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: "이미지 파일을 선택해 주세요." };
  }
  if (!ALLOWED_TYPES.includes(file.type as (typeof ALLOWED_TYPES)[number])) {
    return { ok: false, error: "PNG·JPG·WEBP·GIF 이미지만 지원합니다." };
  }
  if (file.size > MAX_BYTES) {
    return { ok: false, error: "이미지가 너무 큽니다 (최대 6MB)." };
  }

  const data = Buffer.from(await file.arrayBuffer()).toString("base64");
  const client = new Anthropic();
  const today = todayStr();

  try {
    const response = await client.messages.create({
      model: "claude-opus-5",
      max_tokens: 4096,
      system:
        "너는 이미지에서 할 일(태스크) 목록을 추출하는 도우미다. " +
        "커리큘럼·일정표·체크리스트·메모 등 어떤 형태든, 사용자가 실행해야 할 항목을 한 건씩 뽑아라.\n" +
        `오늘 날짜는 ${today} (KST)다. 연도가 없는 날짜는 오늘 기준으로 가장 자연스러운 미래/현재 연도로 해석하라.\n` +
        "반드시 아래 JSON 형식만 출력하라. 설명·마크다운 금지.\n" +
        '{"tasks":[{"title":"할 일 제목 (핵심 정보 포함, 60자 이내)","dueDate":"YYYY-MM-DD 또는 null"}]}\n' +
        "날짜를 알 수 없으면 dueDate는 null. 이미 지난 일정도 포함하되 날짜를 그대로 적어라. " +
        "할 일로 볼 항목이 없으면 tasks를 빈 배열로.",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: { type: "base64", media_type: file.type as "image/png", data },
            },
            { type: "text", text: "이 이미지에서 할 일 목록을 추출해 줘." },
          ],
        },
      ],
    });

    if (response.stop_reason === "refusal") {
      return { ok: false, error: "AI가 이 이미지 처리를 거절했습니다. 다른 이미지로 시도해 주세요." };
    }
    const text = response.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("");
    // 모델이 코드펜스 등을 붙였을 경우를 대비해 첫 { ~ 마지막 } 구간만 파싱
    const start = text.indexOf("{");
    const end = text.lastIndexOf("}");
    if (start < 0 || end <= start) return { ok: false, error: "추출 결과를 해석하지 못했습니다. 다시 시도해 주세요." };
    const parsed = JSON.parse(text.slice(start, end + 1)) as { tasks?: unknown };
    if (!Array.isArray(parsed.tasks)) return { ok: false, error: "추출 결과 형식이 올바르지 않습니다." };

    const tasks: ParsedTask[] = parsed.tasks
      .filter((t): t is { title: unknown; dueDate?: unknown } => !!t && typeof t === "object")
      .map((t) => ({
        title: String(t.title ?? "").trim().slice(0, 200),
        dueDate:
          typeof t.dueDate === "string" && /^\d{4}-\d{2}-\d{2}$/.test(t.dueDate)
            ? t.dueDate
            : null,
      }))
      .filter((t) => t.title.length > 0)
      .slice(0, 30);
    return { ok: true, tasks };
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      return { ok: false, error: "AI API 키가 유효하지 않습니다." };
    }
    if (error instanceof Anthropic.RateLimitError) {
      return { ok: false, error: "AI 사용량 한도에 걸렸습니다. 잠시 후 다시 시도해 주세요." };
    }
    if (error instanceof Anthropic.APIError) {
      return { ok: false, error: `AI 호출 실패 (${error.status}). 잠시 후 다시 시도해 주세요.` };
    }
    throw error;
  }
}
