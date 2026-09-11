import "server-only";
import { ExternalAccountClient } from "google-auth-library";
import { getVercelOidcToken } from "@vercel/functions/oidc";

/**
 * GA4 Data API 클라이언트.
 * 인증: Vercel OIDC 연합으로 GCP 서비스 계정을 가장(impersonate) - 장기 비밀키를 어디에도 저장하지 않는다.
 * 필요 환경변수: GCP_PROJECT_NUMBER, GCP_WORKLOAD_IDENTITY_POOL_ID,
 *   GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID, GCP_SERVICE_ACCOUNT_EMAIL, GA_PROPERTY_ID
 * 설정이 없으면 connected:false 로 조용히 비활성 (화면에 안내만 표시).
 */

export type GaRange = { startDate: string; endDate: string }; // YYYY-MM-DD (GA 속성 시간대 = KST)

export type GaSummary = {
  sessions: number;
  users: number;
  keyEvents: number;
  engagementRate: number; // 0~1
};
export type GaSourceRow = {
  source: string; medium: string; campaign: string;
  sessions: number; users: number; keyEvents: number;
};
export type GaDaily = { day: string; sessions: number };
export type GaReport =
  | {
      connected: true;
      propertyId: string;
      keyEventName: string;
      summary: GaSummary;
      sources: GaSourceRow[];
      daily: GaDaily[];
      fetchedAt: string;
    }
  | { connected: false; reason: string };

const KEY_EVENT = process.env.GA_KEY_EVENT_NAME || "sign_up";
const SCOPE = "https://www.googleapis.com/auth/analytics.readonly";

function oidcConfig() {
  const {
    GCP_PROJECT_NUMBER, GCP_WORKLOAD_IDENTITY_POOL_ID,
    GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID, GCP_SERVICE_ACCOUNT_EMAIL,
  } = process.env;
  if (!GCP_PROJECT_NUMBER || !GCP_WORKLOAD_IDENTITY_POOL_ID || !GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID || !GCP_SERVICE_ACCOUNT_EMAIL)
    return null;
  return {
    num: GCP_PROJECT_NUMBER,
    pool: GCP_WORKLOAD_IDENTITY_POOL_ID,
    provider: GCP_WORKLOAD_IDENTITY_POOL_PROVIDER_ID,
    sa: GCP_SERVICE_ACCOUNT_EMAIL,
  };
}

export function gaConfigured(): boolean {
  return Boolean(process.env.GA_PROPERTY_ID && oidcConfig());
}

let tokenCache: { token: string; exp: number } | null = null;

async function accessToken(): Promise<string> {
  if (tokenCache && tokenCache.exp > Date.now() + 60_000) return tokenCache.token;
  const oidc = oidcConfig();
  if (!oidc) throw new Error("OIDC 설정 없음");
  const client = ExternalAccountClient.fromJSON({
    type: "external_account",
    audience: `//iam.googleapis.com/projects/${oidc.num}/locations/global/workloadIdentityPools/${oidc.pool}/providers/${oidc.provider}`,
    subject_token_type: "urn:ietf:params:oauth:token-type:jwt",
    token_url: "https://sts.googleapis.com/v1/token",
    service_account_impersonation_url: `https://iamcredentials.googleapis.com/v1/projects/-/serviceAccounts/${oidc.sa}:generateAccessToken`,
    // 화살표 함수로 감싸 인자 없이 호출한다 - 컨텍스트가 옵션으로 해석되면 토큰 aud가 바뀐다
    subject_token_supplier: { getSubjectToken: () => getVercelOidcToken() },
  });
  if (!client) throw new Error("OIDC client init failed");
  client.scopes = [SCOPE];
  const { token } = await client.getAccessToken();
  if (!token) throw new Error("OIDC token exchange failed");
  tokenCache = { token, exp: Date.now() + 50 * 60_000 };
  return token;
}

type RunReportBody = {
  dateRanges: GaRange[];
  dimensions?: { name: string }[];
  metrics: { name: string }[];
  dimensionFilter?: unknown;
  orderBys?: unknown[];
  limit?: number;
};
type RunReportRes = {
  rows?: { dimensionValues?: { value: string }[]; metricValues?: { value: string }[] }[];
};

async function runReport(body: RunReportBody): Promise<RunReportRes> {
  const pid = process.env.GA_PROPERTY_ID!;
  const res = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${pid}:runReport`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`GA API ${res.status}: ${(await res.text()).slice(0, 300)}`);
  return (await res.json()) as RunReportRes;
}

const n = (v?: string) => Number(v ?? 0) || 0;

// 5분 캐시 - GA Data API는 무료지만 호출 상한이 있다
const cache = new Map<string, { at: number; data: GaReport }>();

export async function getGaReport(range: GaRange): Promise<GaReport> {
  if (!gaConfigured())
    return { connected: false, reason: "GA_PROPERTY_ID와 OIDC 연합 환경변수가 아직 설정되지 않았습니다." };
  const key = `${range.startDate}|${range.endDate}`;
  const hit = cache.get(key);
  if (hit && Date.now() - hit.at < 5 * 60_000) return hit.data;

  const keyEventFilter = { filter: { fieldName: "eventName", stringFilter: { value: KEY_EVENT } } };
  try {
    const [summary, sources, daily, keyBySource] = await Promise.all([
      runReport({
        dateRanges: [range],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }, { name: "engagementRate" }],
      }),
      runReport({
        dateRanges: [range],
        dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }, { name: "sessionCampaignName" }],
        metrics: [{ name: "sessions" }, { name: "totalUsers" }],
        orderBys: [{ metric: { metricName: "sessions" }, desc: true }],
        limit: 30,
      }),
      runReport({
        dateRanges: [range],
        dimensions: [{ name: "date" }],
        metrics: [{ name: "sessions" }],
        orderBys: [{ dimension: { dimensionName: "date" } }],
      }),
      runReport({
        dateRanges: [range],
        dimensions: [{ name: "sessionSource" }, { name: "sessionMedium" }, { name: "sessionCampaignName" }],
        metrics: [{ name: "eventCount" }],
        dimensionFilter: keyEventFilter,
      }),
    ]);

    const sRow = summary.rows?.[0]?.metricValues ?? [];
    const keyMap = new Map<string, number>();
    for (const r of keyBySource.rows ?? []) {
      const d = r.dimensionValues ?? [];
      keyMap.set(`${d[0]?.value}|${d[1]?.value}|${d[2]?.value}`, n(r.metricValues?.[0]?.value));
    }
    const sourceRows: GaSourceRow[] = (sources.rows ?? []).map((r) => {
      const d = r.dimensionValues ?? [];
      const m = r.metricValues ?? [];
      const k = `${d[0]?.value}|${d[1]?.value}|${d[2]?.value}`;
      return {
        source: d[0]?.value ?? "(not set)",
        medium: d[1]?.value ?? "(not set)",
        campaign: d[2]?.value ?? "(not set)",
        sessions: n(m[0]?.value),
        users: n(m[1]?.value),
        keyEvents: keyMap.get(k) ?? 0,
      };
    });
    const dailyRows: GaDaily[] = (daily.rows ?? []).map((r) => {
      const d = r.dimensionValues?.[0]?.value ?? "";
      return { day: `${d.slice(4, 6)}/${d.slice(6, 8)}`, sessions: n(r.metricValues?.[0]?.value) };
    });
    const totalKey = [...keyMap.values()].reduce((a, b) => a + b, 0);

    const data: GaReport = {
      connected: true,
      propertyId: process.env.GA_PROPERTY_ID!,
      keyEventName: KEY_EVENT,
      summary: {
        sessions: n(sRow[0]?.value),
        users: n(sRow[1]?.value),
        keyEvents: totalKey,
        engagementRate: Number(sRow[2]?.value ?? 0) || 0,
      },
      sources: sourceRows,
      daily: dailyRows,
      fetchedAt: new Date().toISOString(),
    };
    cache.set(key, { at: Date.now(), data });
    return data;
  } catch (e) {
    console.error("[ga] report failed", e);
    let reason = e instanceof Error ? e.message : "GA API 오류";
    // 진단용으로 OIDC 토큰의 공개 클레임(iss/aud/sub)만 덧붙인다 - 토큰 자체는 노출하지 않는다
    try {
      const t = await getVercelOidcToken();
      const payload = JSON.parse(Buffer.from(t.split(".")[1], "base64url").toString("utf8")) as Record<string, unknown>;
      reason += ` | oidc: iss=${String(payload.iss)} aud=${String(payload.aud)} sub=${String(payload.sub)}`;
    } catch (err) {
      reason += ` | oidc token unavailable: ${err instanceof Error ? err.message : String(err)}`;
    }
    return { connected: false, reason };
  }
}
