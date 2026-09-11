import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { asc, desc, sql } from "drizzle-orm";
import { getGaReport, type GaReport } from "@/lib/ga";
import { addDays, todayStr } from "@/lib/dates";
import { db, goals, projects, tasks, routines, shortLinks, linkClicks, utmChannels } from "@/db";
import { users } from "@/db/schema";
import { isAdmin, requireUserId } from "@/lib/session";
import {
  adminDeleteUser, createUtmLinks, setLinkArchived, deleteShortLink,
  createUtmChannel, setChannelArchived, seedUtmChannels,
} from "@/lib/actions";
import { Card, SectionTitle } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { UtmSection, type UtmChannelData, type UtmLinkRow } from "./utm-section";

export const dynamic = "force-dynamic";

async function countByUser(table: typeof goals | typeof projects | typeof tasks | typeof routines) {
  const rows: { userId: number; c: number }[] = await db
    .select({ userId: table.userId, c: sql<number>`count(*)::int` })
    .from(table)
    .groupBy(table.userId);
  return new Map(rows.map((r) => [r.userId, r.c]));
}

const TABS = [
  { key: "users", label: "👥 사용자 관리" },
  { key: "utm", label: "🔗 UTM 만들기" },
  { key: "perf", label: "📒 채널별 성과" },
  { key: "ga", label: "📈 GA 대시보드" },
] as const;
type TabKey = (typeof TABS)[number]["key"];

const GA_RANGES = [
  { key: "7d", label: "7일", days: 7 },
  { key: "30d", label: "30일", days: 30 },
  { key: "90d", label: "90일", days: 90 },
] as const;

export default async function AdminPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  if (!(await isAdmin())) notFound();
  const myId = await requireUserId();
  const sp = await searchParams;
  const tab: TabKey = (TABS.some((t) => t.key === sp.tab) ? sp.tab : "users") as TabKey;
  const gaRangeKey = (GA_RANGES.some((r) => r.key === sp.range) ? sp.range : "30d") as string;

  // GA 리포트는 GA 탭에서만 호출한다 (Data API 상한 절약)
  let ga: GaReport | null = null;
  if (tab === "ga") {
    const days = GA_RANGES.find((r) => r.key === gaRangeKey)!.days;
    const end = todayStr();
    ga = await getGaReport({ startDate: addDays(end, -(days - 1)), endDate: end });
  }

  const [userList, goalCnt, projectCnt, taskCnt, routineCnt, links, clickRows, channelList] = await Promise.all([
    db.select().from(users).orderBy(asc(users.id)),
    countByUser(goals),
    countByUser(projects),
    countByUser(tasks),
    countByUser(routines),
    db.select().from(shortLinks).orderBy(desc(shortLinks.id)),
    db
      .select({ linkId: linkClicks.linkId, c: sql<number>`count(*)::int` })
      .from(linkClicks)
      .groupBy(linkClicks.linkId),
    db.select().from(utmChannels).orderBy(asc(utmChannels.sort), asc(utmChannels.id)),
  ]);
  const clicksOf = new Map(clickRows.map((r) => [r.linkId, r.c]));
  // 링크별 가입 수: users.signup_link_code로 집계 (퍼스트터치)
  const signupsOf = new Map<string, number>();
  for (const u of userList) {
    if (u.signupLinkCode) signupsOf.set(u.signupLinkCode, (signupsOf.get(u.signupLinkCode) ?? 0) + 1);
  }
  const host = (await headers()).get("host") ?? "wid-planner.vercel.app";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;

  // UtmSection에 넘길 직렬화 데이터
  const linkCountOf = new Map<number, number>();
  for (const l of links) {
    if (l.channelId != null) linkCountOf.set(l.channelId, (linkCountOf.get(l.channelId) ?? 0) + 1);
  }
  const utmChannelData: UtmChannelData[] = channelList.map((c) => ({
    id: c.id,
    name: c.name,
    source: c.source,
    medium: c.medium,
    slug: c.slug,
    hint: c.hint,
    archived: c.archived,
    linkCount: linkCountOf.get(c.id) ?? 0,
  }));
  const utmRows: UtmLinkRow[] = links.map((l) => ({
    id: l.id,
    code: l.code,
    channelId: l.channelId,
    channelName: channelList.find((c) => c.id === l.channelId)?.name ?? l.utmSource ?? "직접 입력",
    content: l.utmContent,
    note: l.note,
    creator: l.creator,
    targetPath: l.targetPath,
    clicks: clicksOf.get(l.id) ?? 0,
    signups: signupsOf.get(l.code) ?? 0,
    archived: l.archived,
    createdAt: l.createdAt.toISOString().slice(0, 10),
  }));

  const weekAgo = Date.now() - 7 * 86400000;
  const newThisWeek = userList.filter((u) => u.createdAt.getTime() >= weekAgo).length;
  const agreed = userList.filter((u) => u.privacyAgreedAt).length;
  const totals = {
    goals: [...goalCnt.values()].reduce((a, b) => a + b, 0),
    projects: [...projectCnt.values()].reduce((a, b) => a + b, 0),
    tasks: [...taskCnt.values()].reduce((a, b) => a + b, 0),
  };
  const fmtTs = (d: Date | null) =>
    d
      ? d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "short", timeStyle: "short" })
      : "—";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">⚙️ 어드민</h1>
        <p className="mt-1 text-sm text-neutral-500">
          가입 사용자와 서비스 데이터 현황. 이 페이지는 관리자에게만 보입니다.
        </p>
      </header>

      {/* 탭 */}
      <div className="flex flex-wrap gap-1.5">
        {TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin?tab=${t.key}`}
            className={`rounded-full px-3.5 py-1.5 text-sm ${
              tab === t.key
                ? "bg-neutral-900 font-medium text-white"
                : "bg-white text-neutral-500 hover:bg-neutral-100"
            }`}
          >
            {t.label}
          </Link>
        ))}
      </div>

      {tab === "users" && (
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
        {[
          ["전체 사용자", userList.length],
          ["최근 7일 가입", newThisWeek],
          ["동의 기록 보유", agreed],
          ["전체 목표", totals.goals],
          ["전체 할 일", totals.tasks],
        ].map(([label, value]) => (
          <Card key={label} className="text-center">
            <div className="text-2xl font-bold tabular-nums">{(value as number).toLocaleString()}</div>
            <div className="mt-1 text-xs text-neutral-500">{label}</div>
          </Card>
        ))}
      </div>
      )}

      {/* UTM 만들기 / 채널별 성과 탭 */}
      {(tab === "utm" || tab === "perf") && (
        <UtmSection
          channels={utmChannelData}
          rows={utmRows}
          origin={origin}
          createAction={createUtmLinks}
          archiveLinkAction={setLinkArchived}
          deleteLinkAction={deleteShortLink}
          createChannelAction={createUtmChannel}
          archiveChannelAction={setChannelArchived}
          seedChannelsAction={seedUtmChannels}
          view={tab === "utm" ? "builder" : "ledger"}
        />
      )}

      {/* GA 대시보드 탭 */}
      {tab === "ga" && ga && (
        <Card>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <SectionTitle>📈 GA4 방문 데이터</SectionTitle>
            <div className="flex gap-1.5">
              {GA_RANGES.map((r) => (
                <Link
                  key={r.key}
                  href={`/admin?tab=ga&range=${r.key}`}
                  className={`rounded-full px-3 py-1 text-xs ${
                    gaRangeKey === r.key
                      ? "bg-neutral-900 text-white"
                      : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"
                  }`}
                >
                  {r.label}
                </Link>
              ))}
            </div>
          </div>
          <p className="mb-4 text-xs text-neutral-400">
            채널별 성과 탭은 우리 서버가 센 클릭·가입이고, 여기는 GA4가 센 방문(세션)입니다.
            광고 차단 브라우저는 빠지므로 조금 적게 나올 수 있어요.
          </p>

          {!ga.connected ? (
            <div className="rounded-lg border border-dashed border-neutral-300 p-5 text-sm text-neutral-500">
              <p className="font-medium">아직 GA Data API가 연동되지 않았어요.</p>
              <p className="mt-1 break-all text-xs text-neutral-400">{ga.reason}</p>
            </div>
          ) : (
            <>
              {/* 요약 */}
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                {[
                  ["세션", ga.summary.sessions.toLocaleString(), "GA가 센 방문 수"],
                  ["사용자", ga.summary.users.toLocaleString(), "중복 제외"],
                  ["참여율", `${Math.round(ga.summary.engagementRate * 100)}%`, "튕기지 않은 방문 비율"],
                  [ga.keyEventName, ga.summary.keyEvents.toLocaleString(), "핵심 이벤트 수"],
                ].map(([label, value, hint]) => (
                  <div key={label as string} className="rounded-lg border border-neutral-100 p-3 text-center">
                    <div className="text-2xl font-bold tabular-nums">{value}</div>
                    <div className="mt-0.5 text-xs font-medium text-neutral-500">{label}</div>
                    <div className="text-[11px] text-neutral-300">{hint}</div>
                  </div>
                ))}
              </div>

              {/* 일별 세션 추이 */}
              {ga.daily.length > 0 && (
                <div className="mt-5">
                  <h3 className="mb-2 text-xs font-semibold tracking-wide text-neutral-500">일별 세션</h3>
                  <div className="flex h-24 items-end gap-1">
                    {ga.daily.map((d) => {
                      const max = Math.max(...ga!.connected ? ga!.daily.map((x) => x.sessions) : [1], 1);
                      return (
                        <div key={d.day} className="group flex min-w-0 flex-1 flex-col items-center gap-1" title={`${d.day} · 세션 ${d.sessions}`}>
                          <div
                            className="w-full rounded-t bg-brand/70 transition group-hover:bg-brand"
                            style={{ height: `${Math.max(4, (d.sessions / max) * 88)}px` }}
                          />
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-1 flex justify-between text-[10px] tabular-nums text-neutral-300">
                    <span>{ga.daily[0]?.day}</span>
                    <span>{ga.daily[ga.daily.length - 1]?.day}</span>
                  </div>
                </div>
              )}

              {/* 소스 / 매체 / 캠페인 */}
              <div className="mt-5 overflow-x-auto">
                <h3 className="mb-2 text-xs font-semibold tracking-wide text-neutral-500">소스 / 매체별</h3>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-neutral-200 text-left text-xs text-neutral-400">
                      <th className="py-2 pr-3 font-medium">소스 / 매체</th>
                      <th className="py-2 pr-3 font-medium">캠페인</th>
                      <th className="py-2 pr-3 text-right font-medium">세션</th>
                      <th className="py-2 pr-3 text-right font-medium">사용자</th>
                      <th className="py-2 text-right font-medium">{ga.keyEventName}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {ga.sources.map((s, i) => (
                      <tr key={i} className="border-b border-neutral-100">
                        <td className="py-2 pr-3 font-mono text-xs">{s.source} / {s.medium}</td>
                        <td className="py-2 pr-3 text-xs text-neutral-500">{s.campaign}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{s.sessions.toLocaleString()}</td>
                        <td className="py-2 pr-3 text-right tabular-nums">{s.users.toLocaleString()}</td>
                        <td className="py-2 text-right tabular-nums">{s.keyEvents.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="mt-3 text-[11px] text-neutral-300">
                속성 {ga.propertyId} · 핵심 이벤트 {ga.keyEventName} · 5분 캐시 · GA는 (direct)/(none)처럼 출처를 모르는 방문도 보여줍니다
              </p>
            </>
          )}
        </Card>
      )}

      {tab === "users" && (
      <Card>
        <SectionTitle>사용자 ({userList.length})</SectionTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-neutral-200 text-left text-xs text-neutral-400">
                <th className="py-2 pr-3 font-medium">ID</th>
                <th className="py-2 pr-3 font-medium">사용자</th>
                <th className="py-2 pr-3 font-medium">가입일</th>
                <th className="py-2 pr-3 font-medium">개인정보 동의</th>
                <th className="py-2 pr-3 text-right font-medium">목표</th>
                <th className="py-2 pr-3 text-right font-medium">프로젝트</th>
                <th className="py-2 pr-3 text-right font-medium">할 일</th>
                <th className="py-2 pr-3 text-right font-medium">루틴</th>
                <th className="py-2 font-medium" />
              </tr>
            </thead>
            <tbody>
              {userList.map((u) => (
                <tr key={u.id} className="border-b border-neutral-100">
                  <td className="py-2 pr-3 tabular-nums text-neutral-400">{u.id}</td>
                  <td className="py-2 pr-3">
                    <div className="flex items-center gap-2">
                      {u.image ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={u.image} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
                      ) : (
                        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-neutral-200 text-xs">
                          {(u.name ?? u.email).slice(0, 1)}
                        </span>
                      )}
                      <div className="min-w-0">
                        <div className="truncate font-medium">
                          {u.name ?? "—"}
                          {u.id === myId && <span className="ml-1.5 rounded bg-neutral-100 px-1 py-0.5 text-[10px] text-neutral-500">나</span>}
                        </div>
                        <div className="truncate text-xs text-neutral-400">{u.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap text-xs tabular-nums text-neutral-500">
                    {fmtTs(u.createdAt)}
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap text-xs text-neutral-500">
                    {u.privacyAgreedAt ? (
                      <>
                        {u.privacyPolicyVersion && <span className="mr-1 rounded bg-neutral-100 px-1 py-0.5 text-[10px]">{u.privacyPolicyVersion}</span>}
                        <span className="tabular-nums">{fmtTs(u.privacyAgreedAt)}</span>
                      </>
                    ) : (
                      <span className="text-neutral-300">기록 없음</span>
                    )}
                  </td>
                  <td className="py-2 pr-3 text-right tabular-nums">{goalCnt.get(u.id) ?? 0}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{projectCnt.get(u.id) ?? 0}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{taskCnt.get(u.id) ?? 0}</td>
                  <td className="py-2 pr-3 text-right tabular-nums">{routineCnt.get(u.id) ?? 0}</td>
                  <td className="py-2 text-right">
                    {u.id !== myId && (
                      <form action={adminDeleteUser.bind(null, u.id)}>
                        <ConfirmButton
                          message={`사용자 '${u.email}'(id ${u.id})와 모든 데이터를 완전히 삭제할까요? 되돌릴 수 없습니다.`}
                          className="cursor-pointer text-xs text-neutral-300 hover:text-red-500"
                        >
                          삭제
                        </ConfirmButton>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
      )}
    </div>
  );
}
