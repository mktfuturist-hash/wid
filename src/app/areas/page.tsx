import { db, areas } from "@/db";
import { asc, eq } from "drizzle-orm";
import { createArea, updateArea, toggleAreaArchived } from "@/lib/actions";
import { requireUserId } from "@/lib/session";
import { Card, Empty, FieldLabel, PILLARS, SectionTitle, type Pillar } from "@/components/ui";
import { AreaCard } from "./area-card";

export const dynamic = "force-dynamic";

/* 분류 섹션 헤더 밴드 — 컬러 음영을 가로로 길게 깔아 영역 구분을 또렷하게 */
const BAND: Record<Pillar, string> = {
  work: "bg-work-tint text-work-ink",
  life: "bg-life-tint text-life-ink",
  money: "bg-money-tint text-money-ink",
};

export default async function AreasPage() {
  const uid = await requireUserId();
  const all = await db
    .select()
    .from(areas)
    .where(eq(areas.userId, uid))
    .orderBy(asc(areas.sort), asc(areas.id));
  const active = all.filter((a) => !a.archived);
  const archived = all.filter((a) => a.archived);

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">🚩 최종 목표</h1>
        <p className="mt-1 text-sm text-neutral-500">
          일·삶·돈에서 내가 도달하려는 모습 — 여기서 세부 목표·프로젝트·노트가 뻗어나갑니다.
        </p>
      </header>

      <Card>
        <SectionTitle>새 영역 추가</SectionTitle>
        {/* 상위 카테고리(Work·Life·Money 분류)부터 왼쪽에 배치 */}
        <form action={createArea} className="flex flex-wrap items-end gap-2">
          <label>
            <FieldLabel>분류</FieldLabel>
            <select name="pillar" defaultValue="life">
              <option value="work">Work</option>
              <option value="life">Life</option>
              <option value="money">Money</option>
            </select>
          </label>
          <label>
            <FieldLabel>영역 이름</FieldLabel>
            <input name="name" placeholder="영역 이름 (예: 건강)" required className="w-44" />
          </label>
          <label className="min-w-60 flex-1">
            <FieldLabel>가이드라인</FieldLabel>
            <input name="guideline" placeholder="이 영역에서 나는 어떤 사람이 되고 싶은가?" className="w-full" />
          </label>
          <button type="submit">추가</button>
        </form>
      </Card>

      {(["work", "life", "money"] as Pillar[]).map((pillar) => {
        const list = active.filter((a) => a.pillar === pillar);
        return (
          <section key={pillar}>
            <h2 className={`mb-3 rounded-lg px-3 py-2 text-sm font-semibold ${BAND[pillar]}`}>
              {PILLARS[pillar].icon} {PILLARS[pillar].label}
            </h2>
            {list.length === 0 ? (
              <Empty>아직 영역이 없습니다</Empty>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {list.map((a) => (
                  <AreaCard
                    key={a.id}
                    area={a}
                    updateAction={updateArea.bind(null, a.id)}
                    archiveAction={toggleAreaArchived.bind(null, a.id, true)}
                  />
                ))}
              </div>
            )}
          </section>
        );
      })}

      {archived.length > 0 && (
        <section>
          <SectionTitle>보관됨</SectionTitle>
          <div className="space-y-2">
            {archived.map((a) => (
              <div key={a.id} className="flex items-center gap-2 text-sm text-neutral-400">
                <span>{a.icon} {a.name}</span>
                <form action={toggleAreaArchived.bind(null, a.id, false)}>
                  <button className="unstyled cursor-pointer text-xs underline hover:text-neutral-600">복원</button>
                </form>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
