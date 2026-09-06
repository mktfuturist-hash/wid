import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PGlite는 WASM을 로드하므로 번들링하지 않고 Node에서 직접 require해야 한다
  serverExternalPackages: ["@electric-sql/pglite"],
  experimental: {
    // 이미지 → 할 일 추출 업로드용 (기본 1MB로는 스크린샷이 안 들어간다)
    serverActions: { bodySizeLimit: "8mb" },
  },
};

export default nextConfig;
