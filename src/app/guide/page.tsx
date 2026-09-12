import Link from "next/link";
import type { ReactNode } from "react";
import { Card } from "@/components/ui";

export const metadata = { title: "사용 설명서 - WID" };

function Step({
  no,
  title,
  children,
  href,
  cta,
}: {
  no: number;
  title: string;
  children: ReactNode;
  href: string;
  cta: string;
}) {
  return (
    <Card className="relative">
      <div className="flex items-start gap-4">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-neutral-900 text-sm font-bold text-white">
          {no}
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-base font-bold">{title}</h3>
          <div className="mt-2 space-y-2 text-sm leading-relaxed text-neutral-600">
            {children}
          </div>
          <Link
            href={href}
            className="mt-3 inline-block rounded-lg bg-neutral-900 px-3.5 py-1.5 text-sm font-medium text-white hover:bg-neutral-700"
          >
            {cta} →
          </Link>
        </div>
      </div>
    </Card>
  );
}

function FlowBox({
  icon,
  name,
  desc,
  color,
}: {
  icon: string;
  name: string;
  desc: string;
  color: string;
}) {
  return (
    <div className={`rounded-xl border-2 px-4 py-3 text-center ${color}`}>
      <div className="text-lg">{icon}</div>
      <div className="text-sm font-bold">{name}</div>
      <div className="mt-0.5 text-xs text-neutral-500">{desc}</div>
    </div>
  );
}

function Arrow({ label }: { label: string }) {
  return (
    <div className="flex flex-col items-center py-1 text-neutral-400">
      <span className="text-[11px]">{label}</span>
      <span className="text-base leading-none">↓</span>
    </div>
  );
}

export default function GuidePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-10">
      <header className="space-y-2">
        <p className="text-sm text-neutral-400">
          <Link href="/" className="hover:text-neutral-600">← 대시보드로 돌아가기</Link>
        </p>
        <h1 className="text-3xl font-bold">📖 WID 사용 설명서</h1>
        <p className="text-neutral-500">
          WID(What I Do)는 <b className="text-work-ink">Work</b>·<b className="text-life-ink">Life</b>·<b className="text-money-ink">Money</b> 세
          기둥으로 인생의 목표를 정리하고, <b>달성 여부와 진척률이 자동으로 계산되는</b> 개인 관리
          시스템입니다. 5분만 투자해서 이 페이지를 읽고 시작하면, 각 화면에 무엇을 왜 입력해야
          하는지가 분명해집니다.
        </p>
      </header>

      {/* ── 1. 전체 구조: 데이터가 어떻게 연동되는가 ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">1. 전체 구조 - 데이터가 어떻게 연동되는가</h2>
        <p className="text-sm leading-relaxed text-neutral-600">
          모든 데이터는 <b>최종 목표에서 출발해 아래로 흘러내리는 트리</b>입니다. 위에서 만든 것에
          아래 것을 연결하면, 아래에서 일어난 일(할 일 완료, 루틴 실행, 잔액 변화)이 <b>위로
          거슬러 올라가 세부 목표의 진척률을 자동으로 움직입니다.</b>
        </p>

        <Card className="bg-neutral-50/50">
          <div className="mx-auto max-w-sm">
            <FlowBox icon="🚩" name="최종 목표" desc="내가 도달하려는 모습 - Work·Life·Money 기둥에 소속" color="border-neutral-300 bg-white" />
            <Arrow label="최종 목표 아래에 세부 목표를 만든다" />
            <FlowBox icon="🎯" name="세부 목표" desc="기한 + 측정 방식 → D-day와 진척률 자동 계산" color="border-blue-200 bg-blue-50/50" />
            <Arrow label="세부 목표를 중간 단계로 쪼갠다" />
            <FlowBox icon="📍" name="중간 목표" desc="세부 목표까지의 체크포인트 - 체크하면 진척률이 오른다" color="border-blue-100 bg-white" />
            <Arrow label="세부 목표를 실행 단위로 옮긴다" />
            <FlowBox icon="📁" name="프로젝트" desc="기간이 있는 실행 묶음 - 타임라인·KPI·회고" color="border-emerald-200 bg-emerald-50/50" />
            <Arrow label="프로젝트를 완수할 작업을 나열한다" />
            <FlowBox icon="✅" name="할 일" desc="가장 작은 실행 단위 - 오늘·예정·인박스로 분류" color="border-emerald-100 bg-white" />
          </div>
          <div className="mt-5 grid gap-2 border-t border-neutral-200 pt-4 text-xs text-neutral-500 sm:grid-cols-3">
            <div className="rounded-lg bg-white p-2.5 text-center">
              <b>🔁 데일리 루틴</b><br />세부 목표에 연결 - 실행 기록이 진척의 재료가 됨
            </div>
            <div className="rounded-lg bg-white p-2.5 text-center">
              <b>💰 머니 계좌</b><br />돈 목표에 연결 - 잔액이 곧 진척률
            </div>
            <div className="rounded-lg bg-white p-2.5 text-center">
              <b>📝 노트</b><br />최종 목표·세부 목표·프로젝트 어디에든 붙는 기록
            </div>
          </div>
        </Card>

        <Card>
          <h3 className="mb-2 text-sm font-bold">🧭 메뉴는 세 묶음입니다</h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-600">
            <li><b>오늘을 움직이는 실행</b> - ☀️ 오늘 · ✅ 전체 할 일 · 🔁 데일리 루틴. 매일 여는 화면들입니다.</li>
            <li><b>내 인생의 지도</b> - 🚩 최종 목표 · 🎯 세부 목표 · 📁 프로젝트. 어디로 갈지 정하는 화면들입니다.</li>
            <li><b>쌓아두고 돌아보기</b> - 📝 노트 · 🪞 계획·회고 · 💰 머니. 기록이 쌓이는 화면들입니다.</li>
          </ul>
        </Card>

        <Card>
          <h3 className="mb-2 text-sm font-bold">🔗 자동 연동 규칙 - 직접 외울 필요는 없지만, 알면 편한 것들</h3>
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed text-neutral-600">
            <li><b>세부 목표 상세에서 중간 목표를 추가하면</b> 그 목표에 자동 연결됩니다. 체크할 때마다 진척률이 다시 계산됩니다.</li>
            <li><b>프로젝트 상세에서 할 일을 추가하면</b> 그 프로젝트에 자동 연결되고, 프로젝트의 완료율(3/7 같은)이 자동 집계됩니다.</li>
            <li><b>프로젝트를 세부 목표에 연결하면</b>, 그 프로젝트의 할 일 완료율을 목표 진척률로 쓸 수 있습니다 (측정 방식: 프로젝트 할일 완료율).</li>
            <li><b>데일리 루틴을 세부 목표에 연결하면</b>, 루틴 실행 횟수를 목표 진척률로 쓸 수 있습니다 (측정 방식: 루틴 실행 횟수 - 예: 러닝 100회).</li>
            <li><b>머니 계좌를 돈 목표에 연결하면</b>, 계좌 잔액 ÷ 목표 금액이 곧 진척률입니다. 잔액만 갱신하면 목표가 저절로 움직입니다.</li>
            <li><b>할 일을 프로젝트도 기한도 없이 저장하면</b> 자동으로 <b>인박스</b>에 들어갑니다. 생각나는 대로 던져두고 나중에 분류하는 곳입니다.</li>
          </ul>
        </Card>

        <Card>
          <h3 className="mb-2 text-sm font-bold">📐 진척률 측정 방식 5가지 - 세부 목표마다 하나를 고릅니다</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-neutral-400">
                  <th className="py-2 pr-3">방식</th>
                  <th className="py-2 pr-3">진척률 계산</th>
                  <th className="py-2">이런 목표에 적합</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 text-neutral-600">
                <tr><td className="py-2 pr-3 font-medium">중간 목표 체크</td><td className="py-2 pr-3">완료 중간 목표 ÷ 전체</td><td className="py-2">단계가 명확한 목표 (예: 책 출간)</td></tr>
                <tr><td className="py-2 pr-3 font-medium">수치 직접 입력</td><td className="py-2 pr-3">현재값 ÷ 목표값 (감량처럼 줄어드는 목표는 시작값 기준)</td><td className="py-2">몸무게, 구독자 수처럼 직접 재는 수치</td></tr>
                <tr><td className="py-2 pr-3 font-medium">루틴 실행 횟수</td><td className="py-2 pr-3">연결 루틴 총 실행 ÷ 목표 횟수</td><td className="py-2">꾸준함 자체가 목표 (예: 운동 100회)</td></tr>
                <tr><td className="py-2 pr-3 font-medium">프로젝트 할일 완료율</td><td className="py-2 pr-3">연결 프로젝트들의 할일 완료율</td><td className="py-2">실행 작업량이 곧 진척인 목표</td></tr>
                <tr><td className="py-2 pr-3 font-medium">계좌 잔액</td><td className="py-2 pr-3">연결 계좌 잔액 ÷ 목표 금액</td><td className="py-2">돈 목표 (예: 비상금 3천만원)</td></tr>
              </tbody>
            </table>
          </div>
        </Card>
      </section>

      {/* ── 2. 시작 순서 ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">2. 시작 순서 - 반드시 위에서 아래로</h2>
        <p className="text-sm leading-relaxed text-neutral-600">
          할 일부터 쌓기 시작하면 며칠 안에 <b>&ldquo;내가 이걸 왜 하고 있지?&rdquo;</b>가 됩니다.
          반대로 <b>최종 목표 → 세부 목표 → 중간 목표 → 프로젝트 → 할 일</b> 순서로 내려오면, 모든
          할 일이 어떤 목표를 위한 것인지 연결된 채로 시작됩니다. 아래 순서대로 한 단계씩 입력해 보세요.
        </p>

        <div className="space-y-3">
          <Step no={1} title="🚩 최종 목표 만들기 - 내 인생의 지도 그리기" href="/areas" cta="최종 목표 입력하러 가기">
            <p>
              내가 도달하려는 모습을 3~7개 만듭니다. 각 최종 목표는 <b className="text-work-ink">Work</b>·<b className="text-life-ink">Life</b>·<b className="text-money-ink">Money</b> 중
              한 기둥에 소속시킵니다.
            </p>
            <p className="rounded-lg bg-neutral-50 p-2.5 text-xs">
              예시 - Work: 💼 커리어, 📣 사이드프로젝트 / Life: 🏃 건강, 👨‍👩‍👧 가족, 📚 성장 / Money: 💰 자산
            </p>
            <p>가이드라인 칸에는 &ldquo;이 영역에서 나는 어떤 사람이 되고 싶은가&rdquo;를 한 줄 적어두면 세부 목표 세울 때 나침반이 됩니다.</p>
          </Step>

          <Step no={2} title="🎯 세부 목표 세우기 - 기한과 측정 방식이 핵심" href="/goals" cta="세부 목표 입력하러 가기">
            <p>
              최종 목표마다 1~2개면 충분합니다. 세부 목표를 만들 때 <b>3가지</b>를 꼭 정하세요:
              ① 소속 최종 목표 ② 기한(D-day가 자동 계산됨) ③ <b>측정 방식</b>(위 표에서 선택).
            </p>
            <p className="rounded-lg bg-neutral-50 p-2.5 text-xs">
              예시 - 🏃 건강: &ldquo;72kg까지 감량&rdquo; (수치 직접 입력, 12/31까지) / 💰 자산: &ldquo;비상금 3천만원&rdquo; (계좌 잔액 연동)
            </p>
            <p>측정 방식이 애매하면 일단 <b>중간 목표 체크</b>로 시작하세요. 나중에 세부 목표 상세에서 언제든 바꿀 수 있습니다.</p>
          </Step>

          <Step no={3} title="📍 중간 목표로 쪼개기 - 큰 목표를 체크포인트로" href="/goals" cta="세부 목표 상세에서 중간 목표 추가">
            <p>
              세부 목표를 클릭해 상세로 들어가서, 목표까지의 중간 단계를 기한과 함께 3~5개 추가합니다.
              기한이 가장 가까운 미완료 중간 목표가 <b>&ldquo;🚩 다음 중간 목표&rdquo;</b>로 항상
              표시되므로, 지금 뭘 하면 되는지 헤맬 일이 없습니다.
            </p>
            <p className="rounded-lg bg-neutral-50 p-2.5 text-xs">
              예시 - 72kg 감량: 90kg(2월 말) → 80kg(4월 말) → 72kg(6월 말)
            </p>
          </Step>

          <Step no={4} title="📁 프로젝트 만들기 - 목표를 실행 단위로" href="/projects" cta="프로젝트 입력하러 가기">
            <p>
              세부 목표 달성을 위해 <b>기간을 정해 집중할 실행 묶음</b>을 만듭니다. 만들 때 소속
              최종 목표와 연결할 세부 목표를 선택하고 시작일~종료일을 넣으면 타임라인에 나타납니다.
            </p>
            <p className="rounded-lg bg-neutral-50 p-2.5 text-xs">
              예시 - &ldquo;식단 개편 4주 챌린지&rdquo; (건강 소속, 72kg 목표에 연결, 8/10~9/6)
            </p>
            <p>모든 세부 목표에 프로젝트가 필요하진 않습니다. 루틴만으로 굴러가는 목표(꾸준함형)는 프로젝트 없이 6단계로 넘어가세요.</p>
          </Step>

          <Step no={5} title="✅ 할 일 채우기 - 계획은 곧 할 일 목록" href="/tasks" cta="전체 할 일 입력하러 가기">
            <p>
              프로젝트 상세에 들어가 <b>그 프로젝트를 완수하기 위한 할 일을 전부 나열</b>하세요.
              이 과정이 곧 계획입니다. 각 할 일에 기한을 붙이면 그날 <b>☀️ 오늘</b> 화면에 자동으로 나타납니다.
            </p>
            <p>
              프로젝트와 무관하게 갑자기 떠오르는 일은 <b>입력창에 그냥 던지세요.</b> 자동으로
              인박스에 들어가고, 매일 저녁 인박스를 열어 기한이나 프로젝트를 붙여 분류하면 됩니다.
            </p>
            <p className="rounded-lg bg-neutral-50 p-2.5 text-xs">
              💡 일정표·커리큘럼 스크린샷이 있다면 <b>📷 이미지로 할 일 추출</b>을 쓰세요 - AI가 항목과 날짜를 읽어 한 번에 등록해 줍니다.
            </p>
          </Step>

          <Step no={6} title="🔁 데일리 루틴 등록 - 꾸준함을 기록으로" href="/routines" cta="데일리 루틴 입력하러 가기">
            <p>
              목표 달성을 위해 <b>반복해야 하는 행동</b>을 등록하고 관련 세부 목표에 연결하세요.
              실행할 때마다 버튼 한 번이면 기록되고, 연속 일수(🔥 스트릭)와 28일 히트맵이 자동으로
              쌓입니다. 시험 준비처럼 기간이 정해진 루틴은 기간을 설정하면 그 기간만 집계됩니다.
            </p>
            <p className="rounded-lg bg-neutral-50 p-2.5 text-xs">
              예시 - &ldquo;매일 아침 러닝 30분&rdquo; (72kg 목표 연결), &ldquo;주 3회 독서&rdquo;
            </p>
          </Step>

          <Step no={7} title="💰 머니 세팅 - 계좌 등록과 첫 잔액" href="/money" cta="머니보드 입력하러 가기">
            <p>
              예적금·투자·부동산·대출·보험연금 계좌를 등록하고 현재 잔액을 입력하세요. 이 순간부터
              순자산이 계산되고, <b>월 1회 잔액만 갱신하면</b> 순자산 추이 그래프가 쌓입니다.
            </p>
            <p>
              일상 지출·수입은 가계부 입력창에서 그때그때 기록하세요. 월 지출 구조와 저축률이 자동
              계산됩니다. 돈 목표(2단계)에 계좌를 연결했다면 잔액 갱신 = 목표 진척 갱신입니다.
            </p>
          </Step>
        </div>
      </section>

      {/* ── 3. 매일의 사용 루프 ── */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">3. 세팅이 끝나면 - 매일의 사용 루프</h2>
        <p className="text-sm leading-relaxed text-neutral-600">
          하루의 실행은 <Link href="/today" className="font-semibold underline">☀️ 오늘</Link> 화면
          하나로 끝납니다 - 오늘의 데일리 루틴 체크와 오늘 기한 할 일 처리가 한 화면에 모여 있어요.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Card>
            <h3 className="text-sm font-bold">☀️ 아침 (1분)</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-neutral-600">
              <li><Link href="/today" className="underline">오늘</Link> 화면에서 <b>오늘 할 일</b> 확인</li>
              <li>필요하면 <Link href="/reviews" className="underline">일간 계획</Link> 작성 - 오늘의 최우선 3가지</li>
            </ul>
          </Card>
          <Card>
            <h3 className="text-sm font-bold">⚡ 수시 (10초)</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-neutral-600">
              <li>떠오르는 생각·할 일 → 입력창에 <b>던지기</b> (자동으로 인박스행)</li>
              <li>지출 발생 → <Link href="/money" className="underline">가계부</Link>에 금액·카테고리 기록</li>
              <li>루틴 실행 → <Link href="/today" className="underline">오늘</Link>에서 <b>칩 클릭</b> 한 번</li>
            </ul>
          </Card>
          <Card>
            <h3 className="text-sm font-bold">🌙 저녁 (3분)</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-neutral-600">
              <li><Link href="/tasks?view=inbox" className="underline">인박스</Link> 열어서 기한/프로젝트 붙여 분류 (또는 삭제)</li>
              <li>일간 <Link href="/reviews" className="underline">회고</Link> - 잘한 것 / 아쉬운 것 한 줄씩</li>
            </ul>
          </Card>
          <Card>
            <h3 className="text-sm font-bold">🗓️ 주간 · 월간</h3>
            <ul className="mt-2 list-disc space-y-1 pl-4 text-sm text-neutral-600">
              <li>주간 회고: 세부 목표 진척바 훑어보기 - 안 움직인 목표엔 이유가 있다</li>
              <li>월 1회: <Link href="/money" className="underline">계좌 잔액 갱신</Link> (순자산 스냅샷) + 월간 회고</li>
              <li>끝난 프로젝트엔 회고 작성 → 상태를 완료로</li>
            </ul>
          </Card>
        </div>
      </section>

      {/* ── 4. FAQ ── */}
      <section className="space-y-3">
        <h2 className="text-xl font-bold">4. 자주 묻는 것</h2>
        <Card className="space-y-3 text-sm leading-relaxed text-neutral-600">
          <div>
            <b className="text-neutral-800">Q. 최종 목표와 세부 목표는 뭐가 다른가요?</b>
            <p>최종 목표는 &ldquo;어떤 사람이 되고 싶은가&rdquo;라는 방향(예: 건강), 세부 목표는 기한과 측정 방식이 있는 구체적 과녁(예: 12/31까지 72kg)입니다. 세부 목표는 반드시 최종 목표 아래에 만듭니다.</p>
          </div>
          <div>
            <b className="text-neutral-800">Q. 인박스에는 정확히 뭐가 들어가나요?</b>
            <p>프로젝트도 기한도 없는 할 일 전부입니다. &ldquo;일단 적어두는 곳&rdquo;이므로 부담 없이 던지고, 하루 한 번 정리하세요.</p>
          </div>
          <div>
            <b className="text-neutral-800">Q. 진척률이 &mdash; 로 표시돼요.</b>
            <p>측정 재료가 아직 없다는 뜻입니다. 중간 목표 방식인데 중간 목표가 0개이거나, 수치 방식인데 목표값이 비어있는 경우예요. 세부 목표 상세에서 채워주세요.</p>
          </div>
          <div>
            <b className="text-neutral-800">Q. 세부 목표를 완료하면 어떻게 하나요?</b>
            <p>세부 목표 상세에서 <b>달성 처리</b> 버튼을 누르면 진척률 100%로 고정되고 목록의 &ldquo;달성 🎉&rdquo; 섹션으로 이동합니다.</p>
          </div>
          <div>
            <b className="text-neutral-800">Q. 데이터는 어디에 저장되나요?</b>
            <p>클라우드 DB에 계정별로 분리되어 저장됩니다. 본인 Google 계정으로 로그인해야만 본인 데이터에 접근할 수 있고, 휴대폰·PC 어디서 접속해도 같은 데이터를 봅니다.</p>
          </div>
        </Card>
      </section>

      <footer className="border-t border-neutral-200 pb-4 pt-6 text-center">
        <Link
          href="/areas"
          className="inline-block rounded-xl bg-neutral-900 px-6 py-3 text-base font-bold text-white hover:bg-neutral-700"
        >
          준비 끝 - 1단계: 최종 목표 만들러 가기 →
        </Link>
      </footer>
    </div>
  );
}
