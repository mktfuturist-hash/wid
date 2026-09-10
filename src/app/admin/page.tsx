import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { asc, desc, sql } from "drizzle-orm";
import { db, goals, projects, tasks, routines, shortLinks, linkClicks } from "@/db";
import { users } from "@/db/schema";
import { isAdmin, requireUserId } from "@/lib/session";
import { adminDeleteUser, createShortLink, deleteShortLink } from "@/lib/actions";
import { fmtDate } from "@/lib/dates";
import { Card, FieldLabel, SectionTitle } from "@/components/ui";
import { ConfirmButton } from "@/components/confirm-button";
import { CopyButton } from "@/components/copy-button";

export const dynamic = "force-dynamic";

async function countByUser(table: typeof goals | typeof projects | typeof tasks | typeof routines) {
  const rows: { userId: number; c: number }[] = await db
    .select({ userId: table.userId, c: sql<number>`count(*)::int` })
    .from(table)
    .groupBy(table.userId);
  return new Map(rows.map((r) => [r.userId, r.c]));
}

export default async function AdminPage() {
  if (!(await isAdmin())) notFound();
  const myId = await requireUserId();

  const [userList, goalCnt, projectCnt, taskCnt, routineCnt, links, clickRows] = await Promise.all([
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
  ]);
  const clicksOf = new Map(clickRows.map((r) => [r.linkId, r.c]));
  // 링크별 가입 수: users.signup_link_code로 집계 (퍼스트터치)
  const signupsOf = new Map<string, number>();
  for (const u of userList) {
    if (u.signupLinkCode) signupsOf.set(u.signupLinkCode, (signupsOf.get(u.signupLinkCode) ?? 0) + 1);
  }
  // 채널(utm_source)별 요약
  const bySource = new Map<string, { clicks: number; signups: number }>();
  for (const l of links) {
    const key = l.utmSource ?? "(소스 없음)";
    const agg = bySource.get(key) ?? { clicks: 0, signups: 0 };
    agg.clicks += clicksOf.get(l.id) ?? 0;
    agg.signups += signupsOf.get(l.code) ?? 0;
    bySource.set(key, agg);
  }
  const host = (await headers()).get("host") ?? "wid-planner.vercel.app";
  const origin = `${host.startsWith("localhost") ? "http" : "https"}://${host}`;
  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");

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

      {/* 🔗 UTM 빌더 — 뿌리는 링크마다 꼬리표를 붙여 숏링크로 만든다 */}
      <Card>
        <SectionTitle>🔗 UTM 링크 빌더</SectionTitle>
        <form action={createShortLink} className="flex flex-wrap items-end gap-2">
          <label>
            <FieldLabel>타겟 경로</FieldLabel>
            <input name="targetPath" defaultValue="/landing" className="w-32" />
          </label>
          <label>
            <FieldLabel>utm_source (어디에)</FieldLabel>
            <input name="utmSource" placeholder="kakao_openchat" required className="w-40" />
          </label>
          <label>
            <FieldLabel>utm_medium (형태)</FieldLabel>
            <input name="utmMedium" placeholder="post · dm" className="w-32" />
          </label>
          <label>
            <FieldLabel>utm_campaign (건)</FieldLabel>
            <input name="utmCampaign" placeholder="0913_launch" className="w-32" />
          </label>
          <label>
            <FieldLabel>utm_content (구분)</FieldLabel>
            <input name="utmContent" placeholder="image_a" className="w-28" />
          </label>
          <label className="min-w-40 flex-1">
            <FieldLabel>메모 — 정확히 어디에 뿌렸나</FieldLabel>
            <input name="note" placeholder="예: ○○ 오픈카톡방 (300명)" className="w-full" />
          </label>
          <button type="submit">링크 생성</button>
        </form>
        <p className="mt-2 text-xs text-neutral-400">
          뿌리는 곳마다 링크를 따로 만드세요 — 같은 링크를 세 군데 던지면 세 군데를 구분할 수 없어요.
        </p>
      </Card>

      {/* 📈 성과 대시보드 — 링크별 클릭·가입·전환율, 채널 비교 */}
      <Card>
        <SectionTitle>📈 링크 성과 대시보드</SectionTitle>
        {links.length === 0 ? (
          <p className="py-4 text-center text-sm text-neutral-400">
            아직 링크가 없어요 — 위에서 첫 UTM 링크를 만들어 보세요.
          </p>
        ) : (
          <>
            {/* 채널(utm_source)별 요약 */}
            <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[...bySource.entries()].map(([source, agg]) => (
                <div key={source} className="rounded-lg border border-neutral-100 p-3 text-center">
                  <div className="truncate text-xs font-medium text-neutral-500">{source}</div>
                  <div className="mt-1 text-lg font-bold tabular-nums">
                    {agg.clicks}<span className="text-xs font-normal text-neutral-400"> 클릭</span>
                    {" · "}
                    {agg.signups}<span className="text-xs font-normal text-neutral-400"> 가입</span>
                  </div>
                  <div className="text-xs text-neutral-400">전환율 {pct(agg.signups, agg.clicks)}</div>
                </div>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-neutral-200 text-left text-xs text-neutral-400">
                    <th className="py-2 pr-3 font-medium">숏링크</th>
                    <th className="py-2 pr-3 font-medium">UTM</th>
                    <th className="py-2 pr-3 font-medium">어디에 뿌렸나</th>
                    <th className="py-2 pr-3 font-medium">생성일</th>
                    <th className="py-2 pr-3 text-right font-medium">클릭</th>
                    <th className="py-2 pr-3 text-right font-medium">가입</th>
                    <th className="py-2 pr-3 text-right font-medium">전환율</th>
                    <th className="py-2 font-medium" />
                  </tr>
                </thead>
                <tbody>
                  {links.map((l) => {
                    const clicks = clicksOf.get(l.id) ?? 0;
                    const signups = signupsOf.get(l.code) ?? 0;
                    const shortUrl = `${origin}/l/${l.code}`;
                    return (
                      <tr key={l.id} className="border-b border-neutral-100 align-top">
                        <td className="py-2 pr-3 whitespace-nowrap">
                          <span className="font-mono text-xs">/l/{l.code}</span>
                          <span className="ml-1.5 inline-block"><CopyButton text={shortUrl} /></span>
                        </td>
                        <td className="py-2 pr-3 text-xs text-neutral-500">
                          {[l.utmSource, l.utmMedium, l.utmCampaign, l.utmContent].filter(Boolean).join(" · ") || "—"}
                          <div className="text-[11px] text-neutral-300">→ {l.targetPath}</div>
                        </td>
                        <td className="max-w-40 py-2 pr-3 text-xs text-neutral-500">{l.note ?? "—"}</td>
                        <td className="py-2 pr-3 whitespace-nowrap text-xs tabular-nums text-neutral-400">
                          {fmtDate(l.createdAt.toISOString().slice(0, 10))}
                        </td>
                        <td className="py-2 pr-3 text-right tabular-nums">{clicks}</td>
                        <td className="py-2 pr-3 text-right font-semibold tabular-nums">{signups}</td>
                        <td className="py-2 pr-3 text-right tabular-nums text-neutral-500">{pct(signups, clicks)}</td>
                        <td className="py-2 text-right">
                          <form action={deleteShortLink.bind(null, l.id)}>
                            <ConfirmButton
                              message={`/l/${l.code} 링크를 삭제할까요? 클릭 기록도 함께 지워집니다.`}
                              className="cursor-pointer text-xs text-neutral-300 hover:text-red-500"
                            >
                              삭제
                            </ConfirmButton>
                          </form>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </Card>

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
    </div>
  );
}
