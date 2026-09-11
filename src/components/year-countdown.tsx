"use client";

import { useEffect, useState } from "react";

/* 올해(KST)가 끝나기까지 남은 시간 - D-110 07:23:45 형태 실시간 카운트다운 */
export function YearCountdown() {
  const [now, setNow] = useState<Date | null>(null);

  useEffect(() => {
    setNow(new Date());
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);

  // 서버 렌더와 첫 클라이언트 렌더가 달라지지 않게, 마운트 전엔 자리만 잡는다
  let label = "D-·· ··:··:··";
  if (now) {
    const kstYear = Number(
      new Intl.DateTimeFormat("en", { timeZone: "Asia/Seoul", year: "numeric" }).format(now)
    );
    const end = new Date(`${kstYear}-12-31T23:59:59+09:00`);
    const diff = Math.max(0, end.getTime() - now.getTime());
    const days = Math.floor(diff / 86400000);
    const hh = String(Math.floor((diff % 86400000) / 3600000)).padStart(2, "0");
    const mm = String(Math.floor((diff % 3600000) / 60000)).padStart(2, "0");
    const ss = String(Math.floor((diff % 60000) / 1000)).padStart(2, "0");
    label = `D-${days} ${hh}:${mm}:${ss}`;
  }

  return (
    <div className="inline-flex flex-col items-center gap-1">
      <span className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">
        올해가 끝나기까지
      </span>
      <span className="font-mono text-2xl font-bold tabular-nums tracking-tight text-navy sm:text-3xl">
        {label}
      </span>
    </div>
  );
}
