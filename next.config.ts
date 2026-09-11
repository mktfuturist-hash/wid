import type { NextConfig } from "next";

/* 모든 응답에 붙이는 보안 헤더.
   Vercel 이 HSTS 는 이미 붙여 주지만 나머지는 직접 넣어야 한다. */
const securityHeaders = [
  // 다른 사이트가 내 페이지를 iframe 으로 덮어씌워 클릭을 가로채는 것(클릭재킹)을 막는다
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Content-Security-Policy", value: "frame-ancestors 'none'" },
  // 브라우저가 응답의 Content-Type 을 제멋대로 추측하지 않게 한다
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 외부로 나갈 때 전체 주소 대신 도메인만 넘긴다 (링크에 붙은 UTM 이 새어 나가지 않게)
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 쓰지 않는 브라우저 권한은 아예 닫아 둔다
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
];

const nextConfig: NextConfig = {
  // PGlite는 WASM을 로드하므로 번들링하지 않고 Node에서 직접 require해야 한다
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    // 이미지 → 할 일 추출 업로드용 (기본 1MB로는 스크린샷이 안 들어간다)
    serverActions: { bodySizeLimit: "8mb" },
  },
  async headers() {
    return [
      { source: "/:path*", headers: securityHeaders },
      {
        // 어드민은 검색에 절대 걸리면 안 된다
        source: "/admin/:path*",
        headers: [
          { key: "X-Robots-Tag", value: "noindex, nofollow, noarchive" },
          { key: "Cache-Control", value: "no-store" },
        ],
      },
      {
        // 링크 클릭은 매번 서버까지 와야 센다 — 브라우저·CDN 캐시를 막는다
        source: "/l/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
      {
        source: "/go/:path*",
        headers: [{ key: "Cache-Control", value: "no-store" }],
      },
    ];
  },
};

export default nextConfig;
