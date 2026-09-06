import { sql } from "drizzle-orm";
import { db, users } from "@/db";

// 로그인 화면에 고지된 처리방침 시행일. 방침 개정 시 함께 올린다.
export const PRIVACY_POLICY_VERSION = "2026-09-06";

/** 이메일 기준 upsert — 구글 로그인 = 회원가입. 내부 user id를 반환한다. */
export async function upsertUser(
  email: string,
  name: string | null,
  image: string | null
): Promise<number> {
  const [u] = await db
    .insert(users)
    .values({
      email: email.toLowerCase(),
      name,
      image,
      privacyAgreedAt: new Date(),
      privacyPolicyVersion: PRIVACY_POLICY_VERSION,
    })
    .onConflictDoUpdate({
      target: users.email,
      set: {
        name: name ?? undefined,
        image: image ?? undefined,
        // 동의 기록이 없는 기존 회원은 이번 로그인 시점으로 채우고, 이미 있으면 보존
        privacyAgreedAt: sql`coalesce(${users.privacyAgreedAt}, excluded.privacy_agreed_at)`,
        privacyPolicyVersion: sql`coalesce(${users.privacyPolicyVersion}, excluded.privacy_policy_version)`,
      },
    })
    .returning({ id: users.id });
  return u.id;
}

// 로컬 개발(인증 미설정) 전용 가짜 사용자
const globalDev = globalThis as unknown as { __devUid?: number };

export async function getDevUserId(): Promise<number> {
  if (globalDev.__devUid) return globalDev.__devUid;
  const id = await upsertUser("dev@localhost", "로컬 개발", null);
  globalDev.__devUid = id;
  return id;
}
