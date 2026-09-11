import { asc, desc, eq } from "drizzle-orm";
import { db, moneyAccounts, moneySnapshots, moneyTxns } from "@/db";
import { requireUserId } from "@/lib/session";
import {
  createAccount, updateAccountBalance, deleteAccount, addTxn, deleteTxn,
} from "@/lib/actions";
import { fmtDate, monthStr, todayStr } from "@/lib/dates";
import { Card, Empty, SectionTitle } from "@/components/ui";
import { NumberInput } from "@/components/number-input";
import { TrackSubmit } from "@/components/track";

export const dynamic = "force-dynamic";

const ACCT_TYPE = {
  savings: { label: "예적금", icon: "🏦" },
  invest: { label: "투자", icon: "📈" },
  realestate: { label: "부동산", icon: "🏠" },
  loan: { label: "대출", icon: "💳" },
  pension: { label: "보험·연금", icon: "🛡️" },
} as const;

const EXPENSE_CATS = ["식비", "카페·간식", "교통", "주거·관리", "통신", "쇼핑", "건강", "여가", "교육", "경조사", "구독", "기타"];
const INCOME_CATS = ["급여", "부수입", "이자·배당", "기타수입"];

function krw(n: number): string {
  const abs = Math.abs(n);
  const fmt = (v: number) =>
    (Math.round(v * 10) / 10).toLocaleString("ko-KR", { maximumFractionDigits: 1 });
  const str =
    abs >= 100000000
      ? `${fmt(abs / 100000000)}억`
      : abs >= 10000
        ? `${fmt(abs / 10000)}만`
        : abs.toLocaleString("ko-KR");
  return `${n < 0 ? "-" : ""}${str}원`;
}

/** 월별 순자산 추이 SVG 라인 차트 (서버 렌더, 의존성 없음) */
function TrendChart({ points }: { points: { month: string; netWorth: number }[] }) {
  if (points.length < 2) return null;
  const W = 640, H = 120, PAD = 6;
  const vals = points.map((p) => p.netWorth);
  const min = Math.min(...vals), max = Math.max(...vals);
  const range = max - min || 1;
  const x = (i: number) => PAD + (i / (points.length - 1)) * (W - PAD * 2);
  const y = (v: number) => H - PAD - ((v - min) / range) * (H - PAD * 2);
  const d = points.map((p, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(p.netWorth).toFixed(1)}`).join(" ");
  return (
    <div>
      <svg viewBox={`0 0 ${W} ${H}`} className="h-28 w-full">
        <path d={d} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
        {points.map((p, i) => (
          <circle key={p.month} cx={x(i)} cy={y(p.netWorth)} r="3" fill="#f59e0b" />
        ))}
      </svg>
      <div className="flex justify-between text-xs text-neutral-400">
        <span>{points[0].month}</span>
        <span>{points[points.length - 1].month}</span>
      </div>
    </div>
  );
}

export default async function MoneyPage() {
  const month = monthStr();
  const uid = await requireUserId();
  const [accts, snaps, txns] = await Promise.all([
    db.select().from(moneyAccounts).where(eq(moneyAccounts.userId, uid)).orderBy(asc(moneyAccounts.id)),
    db.select().from(moneySnapshots).where(eq(moneySnapshots.userId, uid)).orderBy(asc(moneySnapshots.month)),
    db.select().from(moneyTxns).where(eq(moneyTxns.userId, uid)).orderBy(desc(moneyTxns.date), desc(moneyTxns.id)),
  ]);

  // ── 머니보드 집계 ──
  const assets = accts.filter((a) => a.type !== "loan").reduce((s, a) => s + a.balance, 0);
  const debts = accts.filter((a) => a.type === "loan").reduce((s, a) => s + a.balance, 0);
  const netWorth = assets - debts;

  const monthTxns = txns.filter((t) => t.date.startsWith(month));
  const income = monthTxns.filter((t) => t.direction === "income").reduce((s, t) => s + t.amount, 0);
  const expense = monthTxns.filter((t) => t.direction === "expense").reduce((s, t) => s + t.amount, 0);
  const savingRate = income > 0 ? Math.round(((income - expense) / income) * 100) : null;

  // 월별 순자산 추이 (스냅샷 기반)
  const months = [...new Set(snaps.map((s) => s.month))].sort();
  const trend = months.map((m) => {
    // 각 계좌의 해당 월까지의 마지막 스냅샷 사용
    let nw = 0;
    for (const a of accts) {
      const mine = snaps.filter((s) => s.accountId === a.id && s.month <= m);
      const last = mine[mine.length - 1];
      if (last) nw += a.type === "loan" ? -last.balance : last.balance;
    }
    return { month: m, netWorth: nw };
  });

  // 카테고리별 지출 합계 (이번 달)
  const byCat = EXPENSE_CATS.concat(
    [...new Set(monthTxns.filter((t) => t.direction === "expense").map((t) => t.category))].filter(
      (c) => !EXPENSE_CATS.includes(c)
    )
  )
    .map((cat) => ({
      cat,
      sum: monthTxns.filter((t) => t.direction === "expense" && t.category === cat).reduce((s, t) => s + t.amount, 0),
    }))
    .filter((c) => c.sum > 0)
    .sort((a, b) => b.sum - a.sum);
  const maxCat = byCat[0]?.sum ?? 1;

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">💰 머니보드</h1>
        <p className="mt-1 text-sm text-neutral-500">
          자산은 월 1회 잔액 갱신, 지출은 그때그때 - 순자산과 저축률이 자동 계산됩니다.
        </p>
      </header>

      {/* 핵심 지표 */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Card>
          <div className="text-xs text-neutral-400">순자산</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-money-ink">{krw(netWorth)}</div>
          <div className="mt-0.5 text-xs text-neutral-400">
            자산 {krw(assets)} − 부채 {krw(debts)}
          </div>
        </Card>
        <Card>
          <div className="text-xs text-neutral-400">{month.slice(5)}월 수입</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-emerald-600">{krw(income)}</div>
        </Card>
        <Card>
          <div className="text-xs text-neutral-400">{month.slice(5)}월 지출</div>
          <div className="mt-1 text-xl font-bold tabular-nums text-red-500">{krw(expense)}</div>
        </Card>
        <Card>
          <div className="text-xs text-neutral-400">저축률</div>
          <div className="mt-1 text-xl font-bold tabular-nums">
            {savingRate != null ? `${savingRate}%` : "—"}
          </div>
          <div className="mt-0.5 text-xs text-neutral-400">(수입−지출)÷수입</div>
        </Card>
      </div>

      {/* 순자산 추이 */}
      {trend.length >= 2 && (
        <Card>
          <SectionTitle>순자산 추이</SectionTitle>
          <TrendChart points={trend} />
        </Card>
      )}

      {/* 빠른 지출/수입 입력 */}
      <Card>
        <SectionTitle>가계부 입력</SectionTitle>
        <form action={addTxn} className="flex flex-wrap items-end gap-2">
          <TrackSubmit event="money_txn_add" />
          <select name="direction" defaultValue="expense">
            <option value="expense">지출</option>
            <option value="income">수입</option>
          </select>
          <NumberInput name="amount" placeholder="금액" required className="w-32 text-right" />
          <input name="category" placeholder="카테고리" required list="cats" className="w-32" />
          <datalist id="cats">
            {EXPENSE_CATS.concat(INCOME_CATS).map((c) => (
              <option key={c} value={c} />
            ))}
          </datalist>
          <input type="date" name="date" defaultValue={todayStr()} />
          <input name="memo" placeholder="메모 (선택)" className="min-w-32 flex-1" />
          <button type="submit">기록</button>
        </form>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* 이번 달 카테고리별 지출 */}
        <Card>
          <SectionTitle>{month.slice(5)}월 지출 구조</SectionTitle>
          {byCat.length === 0 ? (
            <Empty>이번 달 지출 기록이 없습니다</Empty>
          ) : (
            <div className="space-y-2">
              {byCat.map((c) => (
                <div key={c.cat} className="flex items-center gap-2 text-sm">
                  <span className="w-20 shrink-0 text-neutral-600">{c.cat}</span>
                  <div className="h-4 flex-1 overflow-hidden rounded bg-neutral-100">
                    <div className="h-full rounded bg-red-400/80" style={{ width: `${(c.sum / maxCat) * 100}%` }} />
                  </div>
                  <span className="w-20 shrink-0 text-right text-xs tabular-nums text-neutral-500">
                    {krw(c.sum)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>

        {/* 최근 거래 */}
        <Card>
          <SectionTitle>최근 거래</SectionTitle>
          {txns.length === 0 ? (
            <Empty>거래 기록이 없습니다</Empty>
          ) : (
            <div className="max-h-72 space-y-1 overflow-y-auto">
              {txns.slice(0, 30).map((t) => (
                <div key={t.id} className="group flex items-center gap-2 text-sm">
                  <span className="w-14 shrink-0 text-xs tabular-nums text-neutral-400">
                    {t.date.slice(5).replace("-", ".")}
                  </span>
                  <span className="w-16 shrink-0 truncate text-xs text-neutral-500">{t.category}</span>
                  <span className="min-w-0 flex-1 truncate text-neutral-600">{t.memo}</span>
                  <span
                    className={`shrink-0 text-right tabular-nums ${
                      t.direction === "income" ? "text-emerald-600" : "text-neutral-800"
                    }`}
                  >
                    {t.direction === "income" ? "+" : "−"}
                    {t.amount.toLocaleString("ko-KR")}
                  </span>
                  <form action={deleteTxn.bind(null, t.id)}>
                    <button className="invisible text-xs text-neutral-300 hover:text-red-500 group-hover:visible">
                      ✕
                    </button>
                  </form>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {/* 자산 계좌 */}
      <Card>
        <SectionTitle>자산 계좌 - 잔액을 갱신하면 이번 달 스냅샷이 기록됩니다</SectionTitle>
        {accts.length > 0 && (
          <div className="mb-4 space-y-2">
            {accts.map((a) => (
              <form
                key={a.id}
                action={updateAccountBalance.bind(null, a.id)}
                className="group flex items-center gap-2"
              >
                <span className="w-6 text-center">{ACCT_TYPE[a.type].icon}</span>
                <span className="w-16 shrink-0 text-xs text-neutral-400">{ACCT_TYPE[a.type].label}</span>
                <span className="min-w-0 flex-1 truncate text-sm font-medium">{a.name}</span>
                <span className="text-xs text-neutral-400">
                  {fmtDate(new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(a.updatedAt))} 갱신
                </span>
                <NumberInput
                  name="balance"
                  defaultValue={a.balance}
                  className="w-36 text-right tabular-nums"
                />
                <button type="submit" className="btn-ghost text-xs">갱신</button>
                <button
                  formAction={deleteAccount.bind(null, a.id)}
                  className="invisible text-xs text-neutral-300 hover:text-red-500 group-hover:visible"
                >
                  삭제
                </button>
              </form>
            ))}
          </div>
        )}
        <form action={createAccount} className="flex flex-wrap items-end gap-2 border-t border-neutral-100 pt-3">
          <select name="type" defaultValue="savings">
            {Object.entries(ACCT_TYPE).map(([k, v]) => (
              <option key={k} value={k}>{v.icon} {v.label}</option>
            ))}
          </select>
          <input name="name" placeholder="계좌 이름 (예: 카카오뱅크 적금)" required className="min-w-48 flex-1" />
          <NumberInput name="balance" placeholder="현재 잔액" className="w-36 text-right" />
          <button type="submit">추가</button>
        </form>
      </Card>
    </div>
  );
}
