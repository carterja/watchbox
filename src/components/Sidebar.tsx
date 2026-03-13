"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Sparkles, LayoutGrid, Film, Tv, Settings } from "lucide-react";
import { WatchBoxLogo } from "./WatchBoxLogo";

const nav = [
  { href: "/discover", label: "Discover", icon: Sparkles },
  { href: "/all", label: "All", icon: LayoutGrid },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/series", label: "Series", icon: Tv },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <>
      {/* Desktop Sidebar - hidden on mobile */}
      <aside className="hidden md:fixed md:left-0 md:top-0 md:z-30 md:flex md:h-screen md:w-56 md:flex-col md:border-r md:border-shelf-border md:bg-shelf-sidebar">
        <div className="flex h-16 items-center gap-3 border-b border-shelf-border px-4">
          <WatchBoxLogo className="w-10 h-10" />
          <span className="text-xl font-bold text-[#8b5cf6] tracking-wide">WatchBox</span>
        </div>
        <nav className="flex-1 space-y-1 p-3">
          {nav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/discover" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                  isActive
                    ? "bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/20"
                    : "text-shelf-muted hover:bg-shelf-card hover:text-white"
                }`}
              >
                <Icon size={20} className="shrink-0" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="border-t border-shelf-border p-4">
          <div className="flex flex-col gap-1 text-xs text-shelf-muted">
            <div className="inline-flex items-center gap-2">
              <div className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#22d3ee] text-[11px] font-semibold text-white shadow-sm">
                CF
              </div>
              <span className="text-[11px] tracking-wide text-shelf-muted/90">
                Carter Family<span className="align-super text-[9px] ml-0.5">™</span>
              </span>
            </div>
            <p className="text-[11px] text-shelf-muted/80">
              Streaming icons by{" "}
              <a
                href="https://www.flaticon.com/"
                target="_blank"
                rel="noopener noreferrer"
                className="underline decoration-dotted underline-offset-2 hover:text-shelf-accent"
              >
                Flaticon
              </a>
            </p>
          </div>
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-30 h-14 bg-shelf-sidebar border-b border-shelf-border flex items-center justify-between px-4">
        <div className="flex items-center gap-2">
          <WatchBoxLogo className="w-8 h-8" />
          <span className="text-lg font-bold text-[#8b5cf6]">WatchBox</span>
        </div>
        <div className="text-xs text-shelf-muted">
          {nav.find(n => pathname === n.href || (n.href !== "/discover" && pathname.startsWith(n.href)))?.label}
        </div>
      </header>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-30 bg-shelf-sidebar border-t border-shelf-border safe-area-pb">
        <div className="grid grid-cols-5 gap-0.5 p-2">
          {nav.map(({ href, label, icon: Icon }) => {
            const isActive = pathname === href || (href !== "/discover" && pathname.startsWith(href));
            return (
              <Link
                key={href}
                href={href}
                prefetch={false}
                className={`flex flex-col items-center gap-1 rounded-lg px-2 py-2 transition ${
                  isActive
                    ? "bg-[#8b5cf6]/20 text-[#8b5cf6]"
                    : "text-shelf-muted hover:text-white"
                }`}
              >
                <Icon size={20} className="shrink-0" />
                <span className="text-[10px] font-medium">{label}</span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
