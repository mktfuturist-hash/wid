"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logout } from "@/lib/actions";

export type SidebarUser = {
  name: string | null;
  email: string | null;
  image: string | null;
} | null;

type NavItem = {
  href: string;
  label: string;
  icon: string;
  group?: boolean;
  groupLabel?: string;
  /** 상위 메뉴의 하위 구조임을 └ 들여쓰기로 표현 */
  indent?: boolean;
};

/* 메뉴는 세 묶음 - 실행(오늘 움직인다) / 계획(어디로 갈지 정한다) / 기록(쌓아둔다) */
const NAV: NavItem[] = [
  { href: "/", label: "홈", icon: "🏠" },
  { href: "/routines", label: "오늘의 루틴", icon: "🔁", group: true, groupLabel: "오늘을 움직이는 실행" },
  { href: "/tasks", label: "전체 할 일", icon: "✅" },
  // 계층: 최종 목표(영역) > 세부 목표 > 프로젝트 > 할 일
  { href: "/areas", label: "최종 목표", icon: "🚩", group: true, groupLabel: "내 인생의 지도" },
  { href: "/goals", label: "세부 목표", icon: "🎯" },
  { href: "/projects", label: "프로젝트", icon: "📁", indent: true },
  { href: "/notes", label: "노트", icon: "📝", group: true, groupLabel: "쌓아두고 돌아보기" },
  { href: "/reviews", label: "계획·회고", icon: "🪞" },
  { href: "/money", label: "머니", icon: "💰" },
];

const MOBILE_TABS = ["/", "/routines", "/goals", "/money"];
const mobileNav = MOBILE_TABS.map(
  (href) => NAV.find((item) => item.href === href)!,
);

export function Sidebar({ user, isAdmin = false }: { user: SidebarUser; isAdmin?: boolean }) {
  const pathname = usePathname();
  const [drawerOpen, setDrawerOpen] = useState(false);
  // 페이지 이동 시 모바일 드로어 닫기
  useEffect(() => setDrawerOpen(false), [pathname]);
  // 마이페이지는 모두에게, 어드민은 마이페이지 안에서 진입 (관리자에게는 메뉴에도 노출)
  const nav = [
    ...NAV,
    { href: "/mypage", label: "마이페이지", icon: "👤", group: true },
    ...(isAdmin ? [{ href: "/admin", label: "어드민", icon: "⚙️" }] : []),
  ];
  // 랜딩·로그인은 풀페이지(full-bleed) 라우트 - 앱 셸 없이 그린다
  if (pathname === "/landing" || pathname === "/login") return null;
  return (
    <>
      {/* 데스크톱 사이드바 - 슬랙식 다크 네이비 */}
      <aside className="hidden w-52 shrink-0 bg-navy md:block">
        <div className="sticky top-0 flex h-screen flex-col p-4">
          <Link href="/" className="mb-6 block px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo-wide.png" alt="WID planner" className="w-full" />
            <span className="mt-1.5 block text-[13px] leading-tight text-navy-faint">
              What I Do makes me Wiser.
            </span>
          </Link>
          <nav className="space-y-0.5">
            {nav.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <div key={item.href}>
                  {item.group && (
                    <div className="mb-1 mt-3 border-t border-navy-soft pt-2">
                      {item.groupLabel && (
                        <div className="px-2.5 text-[13px] font-semibold tracking-wide text-navy-faint">
                          {item.groupLabel}
                        </div>
                      )}
                    </div>
                  )}
                  <Link
                    href={item.href}
                    className={`relative flex items-center gap-2.5 rounded-lg px-2.5 py-1.5 text-sm transition-colors ${
                      active
                        ? "bg-navy-soft font-medium text-white"
                        : "text-navy-text hover:bg-navy-soft/60 hover:text-white"
                    }`}
                  >
                    {active && (
                      <span className="absolute inset-y-1 left-0 w-0.5 rounded-full bg-brand" />
                    )}
                    {item.indent && <span className="pl-1 text-navy-faint">└</span>}
                    <span className="text-base">{item.icon}</span>
                    {item.label}
                  </Link>
                </div>
              );
            })}
          </nav>
          <div className="mt-auto border-t border-navy-soft pt-3">
            {user ? (
              <div className="flex items-center gap-2 px-1">
                {/* 프로필 클릭 → 마이페이지 */}
                <Link href="/mypage" className="flex min-w-0 flex-1 items-center gap-2 rounded-lg py-1 hover:bg-navy-soft/60">
                  {user.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={user.image}
                      alt=""
                      className="h-7 w-7 rounded-full"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-navy-soft text-xs text-white">
                      {(user.name ?? user.email ?? "?").slice(0, 1)}
                    </span>
                  )}
                  <span className="min-w-0 flex-1 truncate text-xs text-navy-text">
                    {user.name ?? user.email}
                  </span>
                </Link>
                <form action={logout}>
                  <button className="text-xs text-navy-faint hover:text-white">
                    로그아웃
                  </button>
                </form>
              </div>
            ) : (
              <Link href="/mypage" className="block px-1 text-xs text-navy-faint hover:text-white">
                로컬 모드
              </Link>
            )}
          </div>
        </div>
      </aside>

      {/* 모바일 상단 헤더 - 남색 바: 로고 + 마이페이지 + 전체 메뉴(햄버거) */}
      <header className="fixed inset-x-0 top-0 z-40 flex h-14 items-center justify-between bg-navy px-4 md:hidden">
        <Link href="/" className="flex items-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo-wide.png" alt="WID planner" className="h-7 w-auto" />
        </Link>
        <div className="flex items-center gap-1">
          <Link
            href="/mypage"
            aria-label="마이페이지"
            className="flex h-9 w-9 items-center justify-center rounded-lg text-lg hover:bg-navy-soft"
          >
            {user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={user.image} alt="" className="h-6 w-6 rounded-full" referrerPolicy="no-referrer" />
            ) : (
              <span aria-hidden>👤</span>
            )}
          </Link>
          <button
            type="button"
            aria-label="전체 메뉴 열기"
            className="flex h-9 w-9 flex-col items-center justify-center gap-[5px] rounded-lg hover:bg-navy-soft"
            onClick={() => setDrawerOpen(true)}
          >
            <span className="h-0.5 w-5 rounded-full bg-navy-text" />
            <span className="h-0.5 w-5 rounded-full bg-navy-text" />
            <span className="h-0.5 w-5 rounded-full bg-navy-text" />
          </button>
        </div>
      </header>

      {/* 모바일 세로형 GNB 드로어 */}
      {drawerOpen && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="메뉴 닫기"
            className="absolute inset-0 bg-black/40"
            onClick={() => setDrawerOpen(false)}
          />
          <div className="absolute inset-y-0 right-0 flex w-64 flex-col bg-navy p-4 shadow-xl">
            <div className="mb-4 flex items-center justify-between px-2">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src="/logo-wide.png" alt="WID planner" className="h-6 w-auto" />
              <button
                type="button"
                aria-label="닫기"
                className="flex h-8 w-8 items-center justify-center rounded-lg text-lg text-navy-text hover:bg-navy-soft"
                onClick={() => setDrawerOpen(false)}
              >
                ✕
              </button>
            </div>
            <nav className="min-h-0 flex-1 space-y-0.5 overflow-y-auto">
              {nav.map((item) => {
                const active =
                  item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                return (
                  <div key={item.href}>
                    {item.group && (
                      <div className="mb-1 mt-3 border-t border-navy-soft pt-2">
                        {item.groupLabel && (
                          <div className="px-2.5 text-[13px] font-semibold tracking-wide text-navy-faint">
                            {item.groupLabel}
                          </div>
                        )}
                      </div>
                    )}
                    <Link
                      href={item.href}
                      className={`flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-[15px] font-semibold ${
                        active
                          ? "bg-navy-soft text-white"
                          : "text-navy-text hover:bg-navy-soft/60 hover:text-white"
                      }`}
                    >
                      {item.indent && <span className="pl-1 text-navy-faint">└</span>}
                      <span className="text-base">{item.icon}</span>
                      {item.label}
                    </Link>
                  </div>
                );
              })}
            </nav>
            {user && (
              <div className="mt-3 flex items-center justify-between gap-2 border-t border-navy-soft px-2 pt-3">
                <span className="min-w-0 truncate text-xs text-navy-text">
                  {user.name ?? user.email}
                </span>
                <form action={logout}>
                  <button className="text-xs text-navy-faint hover:text-white">로그아웃</button>
                </form>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 모바일 하단 탭바: 홈·할일·루틴·가계부 */}
      <nav className="fixed inset-x-0 bottom-0 z-40 flex border-t border-neutral-200 bg-white/95 backdrop-blur md:hidden">
        {mobileNav.map((item) => {
          const active =
            item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-0.5 py-2 text-[12px] font-medium ${
                active ? "font-semibold text-brand-deep" : "text-neutral-500"
              }`}
            >
              <span className="text-lg leading-none">{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
