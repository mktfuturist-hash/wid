import { db, areas } from "@/db";
import { asc, eq } from "drizzle-orm";
import { createArea, updateArea, toggleAreaArchived } from "@/lib/actions";
import { requireUserId } from "@/lib/session";
import { Card, Empty, PILLARS, SectionTitle, type Pillar } from "@/components/ui";
import { AreaCard } from "./area-card";
import { NewAreaForm } from "./new-area-form";

export const dynamic = "force-dynamic";

/* 분류 섹션 헤더 밴드 - 컬러 음영을 가로로 길게 깔아 영역 구분을 또렷하게 */
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
          일과 삶, 그리고 자산. 내가 도달하려는 모습을 적어주세요. 최종 목표에서부터 세부 목표–프로젝트–할일로 뻗어나갑니다.
        </p>
      </header>

      <Card>
        <SectionTitle>새 영역 추가</SectionTitle>
        {/* 분류를 고르면 이름·가이드라인 예시가 함께 바뀐다 */}
        <NewAreaForm action={createArea} />
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
