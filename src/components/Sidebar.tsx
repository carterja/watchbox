"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sparkles, Film, Tv, Settings } from "lucide-react";

const nav = [
  { href: "/discover", label: "Discover", icon: Sparkles },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/series", label: "Series", icon: Tv },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="fixed left-0 top-0 z-30 flex h-screen w-56 flex-col border-r border-shelf-border bg-shelf-sidebar">
      <div className="flex h-14 items-center gap-2 border-b border-shelf-border px-4">
        <div className="relative h-8 w-8 shrink-0">
          <Image
            src="/watchbox-logo.png"
            alt="WatchBox"
            fill
            className="object-contain"
            priority
          />
        </div>
        <span className="font-semibold text-white">WatchBox</span>
      </div>
      <nav className="flex-1 space-y-0.5 p-2">
        {nav.map(({ href, label, icon: Icon }) => {
          const isActive = pathname === href || (href !== "/discover" && pathname.startsWith(href));
          return (
            <Link
              key={href}
              href={href}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition ${
                isActive
                  ? "bg-shelf-accent text-white"
                  : "text-shelf-muted hover:bg-shelf-card hover:text-white"
              }`}
            >
              <Icon size={20} className="shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-shelf-border p-3">
        <p className="text-xs text-shelf-muted">WatchBox — Track movies & TV</p>
      </div>
    </aside>
  );
}
