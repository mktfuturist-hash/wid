/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import { dday, todayStr } from "@/lib/dates";
import { PILLARS, type Pillar } from "@/components/ui";
import { YearCountdown } from "@/components/year-countdown";

import { KAKAO_CTA } from "@/lib/links";
import { TrackClick } from "@/components/track";
const DEADLINE = "2026-09-14";

function isClosed(): boolean {
  if (process.env.EARLYBIRD_CLOSED === "1") return true;
  return todayStr() > DEADLINE;
}

/** 섹션 눈썹 라벨 - 파란 소제목 */
function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-brand">
      {children}
    </p>
  );
}

/** 구글 G 로고 (공식 4색) */
function GoogleG({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" className={className} aria-hidden>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

function Cta({ closed, from }: { closed: boolean; from: string }) {
  if (closed) {
    return (
      <div className="rounded-xl border border-neutral-200 bg-neutral-100 px-6 py-4 text-center">
        <p className="font-semibold text-neutral-500">얼리버드 모집이 마감됐어요</p>
        <p className="mt-1 text-sm text-neutral-400">
          정식 오픈 소식은 준비되는 대로 알릴게요.
        </p>
      </div>
    );
  }
  return (
    <div className="text-center">
      {/* 가격 앵커 - 원가 대비 얼리버드 혜택 */}
      <p className="mb-2.5 text-base">
        <span className="text-neutral-400 line-through">월 4,900원</span>{" "}
        <span className="font-extrabold text-red-600">→ 얼리버드 기간 한정 0원</span>
      </p>
      <TrackClick event="cta_click" params={{ from }}>
        <a
          href={KAKAO_CTA}
          target="_blank"
          rel="noreferrer"
          className="inline-block w-full max-w-sm rounded-xl bg-brand px-8 py-4 text-lg font-bold text-white shadow-lg shadow-brand/25 transition hover:bg-[#0086d6]"
        >
          얼리버드 신청하기
        </a>
      </TrackClick>
      <p className="mt-2 text-xs text-neutral-400">
        누르면 오픈채팅으로 입장합니다 · 별도 가입 절차 없음
      </p>
    </div>
  );
}

/** 목표→오늘의 할 일→진척바 미니 데모 (CSS 목업) */
function MiniDemo() {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-brand-mist bg-white p-5 shadow-xl shadow-brand-deep/5">
      <div className="mb-1 flex items-center justify-between">
        <span className="text-sm font-bold">💰 비상금 3,000만원 모으기</span>
        <span className="rounded-md bg-brand-mist px-1.5 py-0.5 text-xs font-semibold text-brand-deep">
          D-126
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-neutral-200">
          <div className="h-full w-[42%] rounded-full bg-money" />
        </div>
        <span className="text-xs tabular-nums text-neutral-500">42%</span>
      </div>
      <div className="mt-4 space-y-2 border-t border-neutral-100 pt-3">
        <p className="text-xs font-semibold text-neutral-400">오늘의 할 일</p>
        {[
          { title: "월 저축 이체 확인하기", done: true },
          { title: "고정비 구독 1개 해지", done: false },
        ].map((t) => (
          <div key={t.title} className="flex items-center gap-2.5">
            <span
              className={`flex h-5 w-5 items-center justify-center rounded-md border text-xs ${
                t.done
                  ? "border-brand bg-brand text-white"
                  : "border-neutral-300 bg-white text-transparent"
              }`}
            >
              ✓
            </span>
            <span className={`text-sm ${t.done ? "text-neutral-400 line-through" : ""}`}>
              {t.title}
            </span>
          </div>
        ))}
        <div className="flex items-center gap-2 pt-1">
          <span className="flex items-center gap-1.5 rounded-full bg-emerald-500 px-3 py-1 text-xs font-medium text-white">
            ✓ 아침 30분 독서 <span className="opacity-80">🔥12</span>
          </span>
          <span className="rounded-full border border-dashed border-neutral-300 px-3 py-1 text-xs text-neutral-400">
            저녁 러닝
          </span>
        </div>
      </div>
    </div>
  );
}

const PILLAR_INTRO: { pillar: Pillar; title: string; desc: string }[] = [
  { pillar: "work", title: "Work", desc: "커리어 목표를 세우고, 바쁜 업무 속에서도 방향을 점검해요" },
  { pillar: "life", title: "Life", desc: "건강·가족·성장 - 미루던 삶의 목표를 루틴으로 굳혀요" },
  { pillar: "money", title: "Money", desc: "계좌 잔액만 갱신하면 순자산과 돈 목표 진척률이 자동 계산돼요" },
];

export function Landing() {
  const closed = isClosed();
  const d = dday(DEADLINE);

  return (
    <div className="mx-auto max-w-2xl pb-0">
      {/* 0. 스티키 헤더 */}
      <header className="full-bleed sticky top-0 z-50 -mt-6 border-b border-brand-mist bg-white/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 md:px-8">
          <Link href="/landing" className="flex min-w-0 items-center gap-3">
            <img src="/logo-wide-dark.png" alt="WID planner" className="h-8 w-auto shrink-0" />
            <span className="hidden truncate text-xs italic text-brand-deep/60 md:block">
              What I Do makes me Wiser.
            </span>
          </Link>
          <div className="flex items-center gap-2">
            <Link
              href="/login"
              className="rounded-lg px-3 py-1.5 text-sm font-semibold text-brand-deep transition hover:bg-brand-mist"
            >
              로그인
            </Link>
            {!closed && (
              <TrackClick event="cta_click" params={{ from: "header" }}>
                <a
                  href={KAKAO_CTA}
                  target="_blank"
                  rel="noreferrer"
                  className="rounded-lg bg-brand px-3.5 py-1.5 text-sm font-bold text-white shadow-sm transition hover:bg-[#0086d6]"
                >
                  얼리버드 신청
                </a>
              </TrackClick>
            )}
          </div>
        </div>
      </header>

      {/* 1. 히어로 - 밝은 블루톤 밴드 */}
      <section className="full-bleed bg-gradient-to-b from-brand-mist via-brand-mist/40 to-transparent">
        <div className="mx-auto max-w-2xl space-y-6 px-4 pb-14 pt-14 text-center sm:pt-20">
          <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-4 py-1.5 text-sm font-semibold text-red-600">
            얼리버드 30명 한정
            {!closed && d >= 0 && <span>· 9/14 마감 {d === 0 ? "D-day" : `D-${d}`}</span>}
          </div>
          <h1 className="text-5xl font-extrabold leading-tight tracking-tight text-navy sm:text-6xl">
            멈추지 않는 <span className="text-brand">올해</span>
          </h1>
          <p className="text-xl font-bold text-brand-deep">올해 마지막 100일, 루틴 챌린지</p>
          {/* 올해가 얼마 안 남았다는 걸 초 단위로 체감시키는 카운트다운 */}
          <YearCountdown />
          <p className="text-sm italic text-brand-deep/60">
            WID - &ldquo;What I Do makes me Wiser.&rdquo;
          </p>
          <div className="mx-auto max-w-lg space-y-1.5 text-[15px] leading-relaxed text-neutral-600">
            <p>매일 강의만 듣고 목표만 세우다 한 해가 끝나지는 않으셨나요?</p>
            <p>문제는 목표를 루틴화하지 못했기 때문이에요.</p>
            <p>
              <b className="text-navy">목표를 구조화하고, 할 일을 설정하고, 루틴화하세요.</b>
            </p>
            <p>WID와 함께면 올해의 목표를 달성할 수 있어요.</p>
          </div>
          {/* CTA ① */}
          <Cta closed={closed} from="hero" />
        </div>
      </section>

      <div className="space-y-16 pb-16 pt-4">
        {/* 2. 미니 데모 */}
        <section className="space-y-4">
          <Eyebrow>미리 보기</Eyebrow>
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-navy">
            목표를 <span className="text-brand">오늘</span>로
          </h2>
          <p className="text-center text-[15px] text-neutral-500">
            막연한 목표를 오늘의 할 일로 쪼개면, 진척률이 저절로 차오릅니다
          </p>
          <MiniDemo />
        </section>

        {/* 3. 3기둥 - 연한 블루 밴드 */}
        <section className="full-bleed bg-brand-mist/45">
          <div className="mx-auto max-w-2xl space-y-4 px-4 py-12">
            <Eyebrow>세 기둥</Eyebrow>
            <h2 className="text-center text-3xl font-extrabold tracking-tight text-navy">
              작은 루틴, 큰 성공
            </h2>
            <p className="text-center text-[15px] text-neutral-500">
              인생의 세 기둥을 한 화면에서 - WID는 일과 삶, 목표 자산을 함께 관리하는 라이프 플래너입니다
            </p>
            <div className="grid gap-3 sm:grid-cols-3">
              {PILLAR_INTRO.map(({ pillar, title, desc }) => (
                <div
                  key={pillar}
                  className="rounded-2xl border border-white bg-white p-4 shadow-sm"
                >
                  <div className={`text-sm font-bold ${PILLARS[pillar].color}`}>
                    {PILLARS[pillar].icon} {title}
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-neutral-500">{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* 4. 100일 계산 */}
        <section className="space-y-4">
          <Eyebrow>100일 플랜</Eyebrow>
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-navy">
            지금 시작하면, 올해 안에 결과를 봅니다
          </h2>
          <div className="rounded-2xl border border-brand-mist bg-white p-6 text-center shadow-sm">
            <div className="mx-auto flex max-w-md items-center justify-between text-sm">
              <div>
                <div className="text-2xl font-extrabold text-navy">9월 중순</div>
                <div className="text-xs text-neutral-400">목표 설정 · 시작</div>
              </div>
              <div className="h-px flex-1 bg-brand-mist" />
              <div className="px-2">
                <div className="text-2xl font-extrabold text-brand">100일</div>
                <div className="text-xs text-neutral-400">루틴 실행</div>
              </div>
              <div className="h-px flex-1 bg-brand-mist" />
              <div>
                <div className="text-2xl font-extrabold text-navy">12월 말</div>
                <div className="text-xs text-neutral-400">올해 목표 완주</div>
              </div>
            </div>
            <p className="mt-4 text-sm text-neutral-500">
              내년 계획을 세우는 12월에, 당신은 이미 하나를 끝내 둔 사람이 됩니다.
            </p>
          </div>
        </section>

        {/* 5. 명분 + 자격 */}
        <section className="space-y-3 text-center">
          <Eyebrow>얼리버드</Eyebrow>
          <h2 className="text-3xl font-extrabold tracking-tight text-navy">
            왜 30명에게만 드리냐면요
          </h2>
          <p className="mx-auto max-w-lg text-[15px] leading-relaxed text-neutral-600">
            함께 목표를 향해 달렸던 동기님들께 가장 먼저 열어드려요.
            <br />
            <b className="text-navy">첫 30명의 와이저(Wiser)가 남긴 피드백이 WID의 다음 버전을 만듭니다.</b>
          </p>
          <p className="text-sm text-neutral-400">
            자격은 하나 - <b className="text-brand-deep">올해 이루고 싶은 목표가 하나라도 있는 분</b>
          </p>
        </section>

        {/* 6. CTA ② */}
        <section>
          <Cta closed={closed} from="final" />
        </section>
      </div>

      {/* 7. 푸터 - 다크 네이비 밴드 + 구글 로그인 */}
      <footer className="full-bleed -mb-24 bg-navy md:-mb-10">
        <div className="mx-auto max-w-2xl space-y-5 px-4 py-12 text-center">
          <p className="text-sm font-semibold text-white">이미 얼리버드 멤버신가요?</p>
          <Link
            href="/login"
            className="inline-flex items-center gap-3 rounded-xl bg-white px-6 py-3 text-sm font-semibold text-neutral-700 shadow-md transition hover:bg-brand-mist"
          >
            <GoogleG className="h-5 w-5" />
            Google로 로그인
          </Link>
          <p className="space-x-4 pt-2 text-xs text-navy-faint">
            <Link href="/guide" className="underline hover:text-white">
              사용 설명서 미리 보기
            </Link>
            <Link href="/privacy" className="underline hover:text-white">
              개인정보처리방침
            </Link>
          </p>
          <p className="text-[11px] text-navy-faint/70">
            WID - What I Do makes me Wiser.
          </p>
        </div>
      </footer>
    </div>
  );
}
