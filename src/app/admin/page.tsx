import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { asc, desc, sql } from "drizzle-orm";
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

export default async function AdminPage() {
  if (!(await isAdmin())) notFound();
  const myId = await requireUserId();

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

      {/* UTM 링크 만들기 + 장부 */}
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
      />

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
