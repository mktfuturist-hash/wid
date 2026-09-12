import Link from "next/link";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isAdmin, requireUserId } from "@/lib/session";
import { logout } from "@/lib/actions";
import { authEnabled } from "@/auth.config";
import { Card, SectionTitle } from "@/components/ui";

export const dynamic = "force-dynamic";

export default async function MyPage() {
  const uid = await requireUserId();
  const [me] = await db.select().from(users).where(eq(users.id, uid));
  const admin = await isAdmin();
  const fmtTs = (d: Date | null) =>
    d
      ? d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", dateStyle: "long", timeStyle: "short" })
      : "—";

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold">👤 마이페이지</h1>
        <p className="mt-1 text-sm text-neutral-500">내 계정 정보와 설정.</p>
      </header>

      <Card>
        <SectionTitle>프로필</SectionTitle>
        <div className="flex items-center gap-4">
          {me?.image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={me.image} alt="" className="h-14 w-14 rounded-full" referrerPolicy="no-referrer" />
          ) : (
            <span className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-200 text-xl">
              {(me?.name ?? me?.email ?? "?").slice(0, 1)}
            </span>
          )}
          <div className="min-w-0">
            <div className="font-semibold">{me?.name ?? "이름 없음"}</div>
            <div className="truncate text-sm text-neutral-500">{me?.email}</div>
          </div>
        </div>
        <dl className="mt-4 grid gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
          <div className="flex items-baseline justify-between gap-3 border-b border-neutral-100 pb-1.5">
            <dt className="shrink-0 text-xs text-neutral-400">가입일</dt>
            <dd className="text-right font-medium text-neutral-700">{fmtTs(me?.createdAt ?? null)}</dd>
          </div>
          <div className="flex items-baseline justify-between gap-3 border-b border-neutral-100 pb-1.5">
            <dt className="shrink-0 text-xs text-neutral-400">개인정보 동의</dt>
            <dd className="text-right font-medium text-neutral-700">
              {me?.privacyAgreedAt
                ? `${fmtTs(me.privacyAgreedAt)}${me.privacyPolicyVersion ? ` (${me.privacyPolicyVersion}판)` : ""}`
                : "기록 없음"}
            </dd>
          </div>
        </dl>
        <div className="mt-4 flex items-center gap-3">
          <Link href="/terms" className="mr-3 text-xs text-neutral-400 underline hover:text-neutral-600">
            이용약관
          </Link>
          <Link href="/privacy" className="text-xs text-neutral-400 underline hover:text-neutral-600">
            개인정보 처리방침
          </Link>
          {authEnabled && (
            <form action={logout}>
              <button className="unstyled cursor-pointer text-xs text-neutral-400 underline hover:text-neutral-600">
                로그아웃
              </button>
            </form>
          )}
        </div>
      </Card>

      {admin && (
        <Card pillar="work">
          <SectionTitle>관리자</SectionTitle>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-neutral-600">
              가입 회원 현황·개인정보 동의 기록·계정 관리는 어드민에서.
            </p>
            <Link href="/admin" className="btn shrink-0">
              ⚙️ 어드민 열기
            </Link>
          </div>
        </Card>
      )}
    </div>
  );
}
