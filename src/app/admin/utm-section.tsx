"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import { Card, FieldLabel, SectionTitle } from "@/components/ui";

export type UtmChannelData = {
  id: number;
  name: string;
  source: string;
  medium: string;
  slug: string;
  hint: string | null;
  archived: boolean;
  linkCount: number;
};

export type UtmLinkRow = {
  id: number;
  code: string;
  channelId: number | null;
  channelName: string;
  content: string | null;
  note: string | null;
  creator: string | null;
  targetPath: string;
  clicks: number;
  signups: number;
  archived: boolean;
  createdAt: string; // YYYY-MM-DD
};

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/-+/g, "-").replace(/^-|-$/g, "").slice(0, 40);

const BTN = "cursor-pointer rounded-lg border border-neutral-300 bg-white px-2 py-1 text-xs text-neutral-600 hover:bg-neutral-100";

export function UtmSection({
  channels,
  rows,
  origin,
  createAction,
  archiveLinkAction,
  deleteLinkAction,
  createChannelAction,
  archiveChannelAction,
  seedChannelsAction,
  view = "all",
}: {
  channels: UtmChannelData[];
  rows: UtmLinkRow[];
  origin: string;
  createAction: (fd: FormData) => Promise<{ codes: string[] }>;
  archiveLinkAction: (id: number, archived: boolean) => Promise<void>;
  deleteLinkAction: (id: number) => Promise<void>;
  createChannelAction: (fd: FormData) => Promise<void>;
  archiveChannelAction: (id: number, archived: boolean) => Promise<void>;
  seedChannelsAction: () => Promise<void>;
  /** 탭 분리용 - builder(만들기만) / ledger(장부만) / all */
  view?: "all" | "builder" | "ledger";
}) {
  const [selected, setSelected] = useState<number[]>([]);
  const [content, setContent] = useState("");
  const [memo, setMemo] = useState("");
  const [creator, setCreator] = useState("");
  const [campaign, setCampaign] = useState("");
  const [targetPath, setTargetPath] = useState("/landing");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [customSource, setCustomSource] = useState("");
  const [customMedium, setCustomMedium] = useState("");
  const [manageChannels, setManageChannels] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  // 장부 필터
  const [filterChannel, setFilterChannel] = useState<number | "all">("all");
  const [showArchived, setShowArchived] = useState(false);
  const [query, setQuery] = useState("");

  // 만든 사람은 브라우저가 기억
  useEffect(() => {
    try {
      const saved = localStorage.getItem("wid_utm_creator");
      if (saved) setCreator(saved);
    } catch {}
  }, []);

  const activeChannels = channels.filter((c) => !c.archived);
  const toggle = (id: number) =>
    setSelected((s) => (s.includes(id) ? s.filter((x) => x !== id) : [...s, id]));

  // 소재 코드 자동 제안: 선택한 채널의 기존 링크 수 + 1
  const suggestion = useMemo(() => {
    if (selected.length === 0) return "";
    const max = Math.max(...selected.map((id) => channels.find((c) => c.id === id)?.linkCount ?? 0));
    return `post${String(max + 1).padStart(2, "0")}`;
  }, [selected, channels]);

  const previews = selected
    .map((id) => channels.find((c) => c.id === id))
    .filter((c): c is UtmChannelData => !!c)
    .map((c) => ({ name: c.name, code: content ? `${c.slug}-${slugify(content) || "x"}` : c.slug }));

  const shortUrl = (code: string) => `${origin}/l/${code}`;
  const copy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // prompt 미지원 환경(PWA 등)도 있으니 실패해도 조용히 넘어간다
      try {
        window.prompt("복사가 막혀 있어요 - 직접 복사하세요:", text);
      } catch {}
      return false;
    }
  };

  const create = () => {
    if (selected.length === 0 && !customSource.trim()) {
      setMessage("채널을 고르거나, 고급에서 source를 직접 입력하세요.");
      return;
    }
    const fd = new FormData();
    selected.forEach((id) => fd.append("channelIds", String(id)));
    fd.set("content", content.trim());
    fd.set("memo", memo.trim());
    fd.set("creator", creator.trim());
    fd.set("campaign", campaign.trim());
    fd.set("targetPath", targetPath.trim() || "/landing");
    fd.set("customSource", customSource.trim());
    fd.set("customMedium", customMedium.trim());
    try {
      localStorage.setItem("wid_utm_creator", creator.trim());
    } catch {}
    startTransition(async () => {
      const { codes } = await createAction(fd);
      if (codes.length === 0) {
        setMessage("생성에 실패했어요 - 입력을 확인해 주세요.");
        return;
      }
      if (codes.length === 1) {
        await copy(shortUrl(codes[0]));
        setMessage(`✅ 만들었어요 - ${shortUrl(codes[0])} (복사됨)`);
      } else {
        await copy(codes.map(shortUrl).join("\n"));
        setMessage(`✅ ${codes.length}개 링크를 만들었어요 (전부 복사됨)`);
      }
      setContent("");
      setMemo("");
    });
  };

  // ── 장부 데이터 ──
  const filtered = rows.filter(
    (r) =>
      (showArchived ? true : !r.archived) &&
      (filterChannel === "all" || r.channelId === filterChannel) &&
      (!query.trim() ||
        [r.code, r.note ?? "", r.content ?? "", r.creator ?? ""].some((s) =>
          s.toLowerCase().includes(query.trim().toLowerCase())
        ))
  );
  const totals = filtered.reduce(
    (a, r) => ({ clicks: a.clicks + r.clicks, signups: a.signups + r.signups }),
    { clicks: 0, signups: 0 }
  );
  const pct = (a: number, b: number) => (b > 0 ? `${Math.round((a / b) * 100)}%` : "—");

  return (
    <>
      {/* ── 링크 만들기 ── */}
      {view !== "ledger" && (
      <Card>
        <SectionTitle>🔗 UTM 링크 만들기</SectionTitle>
        <p className="-mt-1 mb-4 text-xs text-neutral-400">
          채널을 고르고 만들기를 누르면 끝 - 짧은 링크가 바로 복사됩니다. 여러 채널을 고르면 같은 소재로 한 번에 만들어요.
        </p>

        {/* 1 · 채널 */}
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-xs font-semibold tracking-wide text-neutral-500">1 · 어디에 걸 링크인가요</h3>
          <button type="button" className="text-xs text-neutral-400 underline hover:text-neutral-600" onClick={() => setManageChannels(!manageChannels)}>
            채널 추가·관리
          </button>
        </div>
        <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {activeChannels.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => toggle(c.id)}
              className={`cursor-pointer rounded-lg border p-3 text-left transition ${
                selected.includes(c.id)
                  ? "border-emerald-500 bg-emerald-50/60 ring-1 ring-emerald-500"
                  : "border-neutral-200 bg-white hover:border-neutral-400"
              }`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded border text-[10px] ${
                    selected.includes(c.id) ? "border-emerald-600 bg-emerald-600 text-white" : "border-neutral-300 text-transparent"
                  }`}
                >
                  ✓
                </span>
                <span className="font-semibold">{c.name}</span>
              </div>
              <div className="mt-1 font-mono text-[11px] text-neutral-400">
                {c.source} / {c.medium}
                {c.linkCount > 0 && <span> · 링크 {c.linkCount}</span>}
              </div>
              {c.hint && <div className="mt-0.5 text-xs text-neutral-400">{c.hint}</div>}
            </button>
          ))}
        </div>

        {/* 채널 관리 */}
        {manageChannels && (
          <div className="mt-3 rounded-lg border border-dashed border-neutral-300 p-3">
            <form
              action={(fd) => startTransition(async () => { await createChannelAction(fd); })}
              className="flex flex-wrap items-end gap-2"
            >
              <label><FieldLabel>채널 이름</FieldLabel><input name="name" placeholder="예: 링크드인 글" required className="w-36" /></label>
              <label><FieldLabel>source</FieldLabel><input name="source" placeholder="linkedin" required className="w-28" /></label>
              <label><FieldLabel>medium</FieldLabel><input name="medium" placeholder="post" required className="w-24" /></label>
              <label><FieldLabel>코드 접두어</FieldLabel><input name="slug" placeholder="li-post" className="w-24" /></label>
              <label className="min-w-40 flex-1"><FieldLabel>팁 한 줄</FieldLabel><input name="hint" className="w-full" /></label>
              <button type="submit" className="btn">채널 추가</button>
            </form>

            <div className="mt-2 flex flex-wrap items-center gap-2 border-t border-dashed border-neutral-200 pt-2">
              <button
                type="button"
                className="btn"
                onClick={() => startTransition(async () => { await seedChannelsAction(); })}
              >
                기본 프리셋 6종 채우기
              </button>
              <span className="text-xs text-neutral-400">
                스폰지클럽 슬랙 · 강의 동기 단톡방 · 지인 1:1 · 인스타 게시물 · 인스타 프로필 · 오프라인 QR
                <span className="ml-1 text-neutral-300">(이미 있는 건 건너뜁니다)</span>
              </span>
            </div>

            <p className="mt-2 text-xs leading-relaxed text-neutral-400">
              프리셋은 <b className="text-neutral-500">적게 유지하는 게 좋습니다.</b> 슬랙 채널이 여러 개여도
              채널을 새로 만들지 말고 하나를 고른 뒤 <code className="rounded bg-neutral-100 px-1">content</code> 로
              가르세요 - <code className="rounded bg-neutral-100 px-1">net_channel</code>{" "}
              <code className="rounded bg-neutral-100 px-1">team2</code>{" "}
              <code className="rounded bg-neutral-100 px-1">notice</code> 처럼요.
              같은 곳이 두 이름으로 갈리면 대시보드가 조각납니다.
            </p>
            {channels.some((c) => c.archived) || activeChannels.length > 0 ? (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {channels.map((c) => (
                  <span key={c.id} className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs ${c.archived ? "border-neutral-200 text-neutral-300" : "border-neutral-300 text-neutral-500"}`}>
                    {c.name}
                    <button
                      type="button"
                      className="cursor-pointer hover:text-neutral-700"
                      onClick={() => startTransition(async () => { await archiveChannelAction(c.id, !c.archived); })}
                    >
                      {c.archived ? "복원" : "보관"}
                    </button>
                  </span>
                ))}
              </div>
            ) : null}
          </div>
        )}

        {/* 2 · 소재 */}
        <h3 className="mb-2 mt-5 text-xs font-semibold tracking-wide text-neutral-500">2 · 소재</h3>
        <div className="flex flex-wrap items-end gap-2">
          <label>
            <FieldLabel>소재 코드 {suggestion && `(비우면 ${suggestion})`}</FieldLabel>
            <input value={content} onChange={(e) => setContent(e.target.value)} placeholder={suggestion || "채널을 먼저 고르세요"} className="w-40" />
          </label>
          <label className="min-w-44 flex-1">
            <FieldLabel>메모 - 비우면 자동</FieldLabel>
            <input value={memo} onChange={(e) => setMemo(e.target.value)} placeholder="예: 9/13 첫 카드뉴스" className="w-full" />
          </label>
          <label>
            <FieldLabel>만든 사람 - 브라우저가 기억</FieldLabel>
            <input value={creator} onChange={(e) => setCreator(e.target.value)} placeholder="이름" className="w-28" />
          </label>
        </div>
        <button type="button" className="mt-2 text-xs text-neutral-400 underline hover:text-neutral-600" onClick={() => setShowAdvanced(!showAdvanced)}>
          고급: 캠페인·도착지·source 직접 입력
        </button>
        {showAdvanced && (
          <div className="mt-2 flex flex-wrap items-end gap-2 rounded-lg border border-dashed border-neutral-300 p-3">
            <label><FieldLabel>utm_campaign</FieldLabel><input value={campaign} onChange={(e) => setCampaign(e.target.value)} placeholder="0913_launch" className="w-32" /></label>
            <label><FieldLabel>도착지 경로</FieldLabel><input value={targetPath} onChange={(e) => setTargetPath(e.target.value)} className="w-32" /></label>
            <label><FieldLabel>source 직접 (채널 미선택 시)</FieldLabel><input value={customSource} onChange={(e) => setCustomSource(e.target.value)} placeholder="blog" className="w-28" /></label>
            <label><FieldLabel>medium 직접</FieldLabel><input value={customMedium} onChange={(e) => setCustomMedium(e.target.value)} placeholder="post" className="w-24" /></label>
          </div>
        )}

        {/* 3 · 만들기 */}
        <h3 className="mb-2 mt-5 text-xs font-semibold tracking-wide text-neutral-500">3 · 만들기</h3>
        <div className="rounded-lg bg-neutral-50 p-3">
          {previews.length === 0 && !customSource ? (
            <p className="text-sm text-neutral-400">위에서 채널을 고르면 만들어질 링크가 여기 미리 보입니다.</p>
          ) : (
            <ul className="space-y-1">
              {(previews.length > 0 ? previews : [{ name: customSource, code: slugify(`${customSource}${content ? `-${content}` : ""}`) }]).map((p) => (
                <li key={p.code} className="flex flex-wrap items-baseline gap-2 text-sm">
                  <span className="text-xs text-neutral-400">{p.name}</span>
                  <span className="font-mono text-emerald-700">{origin}/l/{p.code}</span>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-3 flex items-center gap-3">
            <button type="button" className="btn" onClick={create} disabled={pending}>
              {pending ? "만드는 중…" : `만들기${selected.length > 1 ? ` (${selected.length}개)` : ""}`}
            </button>
            <span className="text-xs text-neutral-400">장부에 기록되고, 바로 복사됩니다.</span>
          </div>
          {message && <p className="mt-2 text-sm text-emerald-700">{message}</p>}
        </div>
      </Card>
      )}

      {/* ── 장부 ── */}
      {view !== "builder" && (
      <Card>
        <SectionTitle>📒 장부</SectionTitle>
        <p className="-mt-1 mb-3 text-xs text-neutral-400">
          만든 링크 전부와 링크별 클릭·가입·전환율. 클릭은 짧은 링크를 거친 방문만 셉니다.
        </p>
        <div className="mb-3 flex flex-wrap items-center gap-1.5">
          <button type="button" onClick={() => setFilterChannel("all")} className={`rounded-full px-3 py-1 text-xs ${filterChannel === "all" ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>
            모든 채널
          </button>
          {activeChannels.map((c) => (
            <button key={c.id} type="button" onClick={() => setFilterChannel(c.id)} className={`rounded-full px-3 py-1 text-xs ${filterChannel === c.id ? "bg-neutral-900 text-white" : "bg-neutral-100 text-neutral-500 hover:bg-neutral-200"}`}>
              {c.name}
            </button>
          ))}
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="메모·코드 검색" className="ml-auto w-36" />
          <label className="flex items-center gap-1 text-xs text-neutral-400">
            <input type="checkbox" checked={showArchived} onChange={(e) => setShowArchived(e.target.checked)} />
            보관한 링크도 보기
          </label>
        </div>
        <p className="mb-2 text-xs font-medium text-neutral-500">
          링크 {filtered.length} · 클릭 {totals.clicks} · 가입 {totals.signups} · 전환 {pct(totals.signups, totals.clicks)}
        </p>
        {filtered.length === 0 ? (
          <p className="py-6 text-center text-sm text-neutral-400">링크가 없어요 - 위에서 첫 링크를 만들어 보세요.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-neutral-200 text-left text-xs text-neutral-400">
                  <th className="py-2 pr-3 font-medium">채널</th>
                  <th className="py-2 pr-3 font-medium">소재</th>
                  <th className="py-2 pr-3 font-medium">메모</th>
                  <th className="py-2 pr-3 font-medium">짧은 링크</th>
                  <th className="py-2 pr-3 text-right font-medium">클릭</th>
                  <th className="py-2 pr-3 text-right font-medium">가입</th>
                  <th className="py-2 pr-3 text-right font-medium">전환</th>
                  <th className="py-2 pr-3 font-medium">만든 날</th>
                  <th className="py-2 font-medium" />
                </tr>
              </thead>
              <tbody>
                {filtered.map((r) => (
                  <tr key={r.id} className={`border-b border-neutral-100 align-top ${r.archived ? "opacity-50" : ""}`}>
                    <td className="py-2 pr-3 whitespace-nowrap text-xs">{r.channelName}</td>
                    <td className="py-2 pr-3 font-mono text-xs">{r.content ?? "—"}</td>
                    <td className="max-w-44 py-2 pr-3 text-xs text-neutral-500">
                      <div className="line-clamp-2">{r.note ?? "—"}</div>
                      {r.creator && <div className="text-[11px] text-neutral-300">{r.creator}</div>}
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap font-mono text-xs">/l/{r.code}</td>
                    <td className="py-2 pr-3 text-right tabular-nums">{r.clicks}</td>
                    <td className="py-2 pr-3 text-right font-semibold tabular-nums">{r.signups}</td>
                    <td className="py-2 pr-3 text-right tabular-nums text-neutral-500">{pct(r.signups, r.clicks)}</td>
                    <td className="py-2 pr-3 whitespace-nowrap text-xs tabular-nums text-neutral-400">{r.createdAt}</td>
                    <td className="py-2 whitespace-nowrap text-right">
                      <span className="inline-flex gap-1">
                        <button type="button" className={BTN} onClick={() => copy(shortUrl(r.code))}>복사</button>
                        <a href={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(shortUrl(r.code))}`} target="_blank" rel="noreferrer" className={BTN}>
                          QR
                        </a>
                        <button type="button" className={BTN} onClick={() => startTransition(async () => { await archiveLinkAction(r.id, !r.archived); })}>
                          {r.archived ? "복원" : "보관"}
                        </button>
                        {r.archived && (
                          <button
                            type="button"
                            className="cursor-pointer rounded-lg px-2 py-1 text-xs text-neutral-300 hover:text-red-500"
                            onClick={() => {
                              if (window.confirm(`/l/${r.code} 링크를 완전히 삭제할까요? 클릭 기록도 지워집니다.`))
                                startTransition(async () => { await deleteLinkAction(r.id); });
                            }}
                          >
                            삭제
                          </button>
                        )}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
      )}
    </>
  );
}
