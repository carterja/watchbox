"use client";

import { Fragment, useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { LucideIcon } from "lucide-react";
import {
  Sparkles,
  LayoutGrid,
  Film,
  Tv,
  Settings,
  Menu,
  GripVertical,
  Check,
  MonitorPlay,
  ChevronLeft,
  ChevronRight,
  ListOrdered,
  MoreHorizontal,
} from "lucide-react";
import { WatchBoxLogo } from "./WatchBoxLogo";
import { MobileMoreSheet } from "./MobileMoreSheet";
import { useMobileFilters } from "@/contexts/MobileFiltersContext";
import { useMediaList } from "@/contexts/MediaListContext";
import { useReorderMode } from "@/contexts/ReorderModeContext";
import { useSidebarCollapse } from "@/contexts/SidebarCollapseContext";
import { DisplayModeToggle } from "./DisplayModeToggle";
import { Tooltip } from "./Tooltip";

/** Full list — desktop sidebar only (comfortable width). */
const desktopNav = [
  { href: "/discover", label: "Discover", icon: Sparkles },
  { href: "/all", label: "All", icon: LayoutGrid },
  { href: "/movies", label: "Movies", icon: Film },
  { href: "/series", label: "Series", icon: Tv },
  { href: "/watching", label: "Watching", icon: MonitorPlay },
  { href: "/overview", label: "Queue", icon: ListOrdered },
  { href: "/settings", label: "Settings", icon: Settings },
] as const;

function isLibrarySection(pathname: string): boolean {
  return pathname === "/all" || pathname === "/movies" || pathname === "/series";
}

function isMoreDestinations(pathname: string): boolean {
  return pathname === "/settings" || pathname === "/plex";
}

type MobileTab =
  | { kind: "link"; href: string; label: string; icon: LucideIcon; isActive: (pathname: string) => boolean }
  | { kind: "more"; label: string; icon: LucideIcon; isActive: (pathname: string) => boolean };

/** Five slots + “More” sheet — no horizontal scroll on small screens. */
const mobileTabs: MobileTab[] = [
  {
    kind: "link",
    href: "/discover",
    label: "Discover",
    icon: Sparkles,
    isActive: (p) => p === "/discover",
  },
  {
    kind: "link",
    href: "/all",
    label: "Library",
    icon: LayoutGrid,
    isActive: (p) => isLibrarySection(p),
  },
  {
    kind: "link",
    href: "/watching",
    label: "Watching",
    icon: MonitorPlay,
    isActive: (p) => p === "/watching",
  },
  {
    kind: "link",
    href: "/overview",
    label: "Queue",
    icon: ListOrdered,
    isActive: (p) => p === "/overview",
  },
  { kind: "more", label: "More", icon: MoreHorizontal, isActive: (p) => isMoreDestinations(p) },
];

function navItemIsActive(pathname: string, href: string): boolean {
  if (pathname === href) return true;
  if (href === "/settings" && pathname.startsWith("/plex")) return true;
  if (href !== "/discover" && pathname.startsWith(href)) return true;
  return false;
}

const LIST_PATHS = ["/all", "/movies", "/series"] as const;

function isListPage(pathname: string) {
  return LIST_PATHS.some((p) => pathname === p || pathname.startsWith(p + "/"));
}

/** Grid/list/gallery toggle — only pages that consume DisplayModeContext for media grids. */
function isDisplayModePage(pathname: string): boolean {
  return isListPage(pathname);
}

/** Burger opens MobileFiltersPanel — only routes that wrap filters in that panel. */
function isMobileFiltersPage(pathname: string): boolean {
  return isListPage(pathname) || pathname === "/watching" || pathname.startsWith("/watching/");
}

export function Sidebar() {
  const pathname = usePathname();
  const [moreOpen, setMoreOpen] = useState(false);
  const { toggle } = useMobileFilters();

  useEffect(() => {
    setMoreOpen(false);
  }, [pathname]);
  const { list, loading } = useMediaList();
  const { reorderMode, setReorderMode } = useReorderMode();
  const showReorder = isListPage(pathname);

  const { collapsed, toggleCollapsed } = useSidebarCollapse();

  let unwatched = 0;
  let inProgress = 0;
  for (const m of list) {
    if (m.status === "yet_to_start") unwatched++;
    else if (m.status === "in_progress") inProgress++;
  }
  const showBacklog = !loading && list.length > 0 && (unwatched > 0 || inProgress > 0);

  return (
    <>
      {/* Desktop Sidebar (md+) — collapsible to icon rail */}
      <aside
        className={`hidden md:fixed md:left-0 md:top-0 md:z-30 md:flex md:h-screen md:flex-col md:border-r md:border-shelf-border md:bg-shelf-sidebar md:overflow-hidden transition-[width] duration-200 ease-out ${
          collapsed ? "md:w-16" : "md:w-56"
        }`}
      >
        <div
          className={`flex shrink-0 border-b border-shelf-border transition-[padding] duration-200 ${
            collapsed ? "flex-col items-center gap-2 py-3 px-0" : "h-16 flex-row items-center justify-between gap-2 px-3"
          }`}
        >
          <div
            className={`flex items-center gap-3 min-w-0 w-full ${collapsed ? "justify-center" : ""}`}
          >
            <WatchBoxLogo className={collapsed ? "w-9 h-9" : "w-10 h-10"} />
            {!collapsed && (
              <span className="text-xl font-bold text-[#8b5cf6] tracking-wide truncate">WatchBox</span>
            )}
          </div>
          <button
            type="button"
            onClick={toggleCollapsed}
            className={`rounded-lg p-1.5 text-shelf-muted hover:bg-shelf-card hover:text-white transition shrink-0 ${
              collapsed ? "w-full flex justify-center" : ""
            }`}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </button>
        </div>
        <nav
          className={`flex-1 overflow-y-auto overflow-x-hidden p-2 ${
            collapsed ? "flex flex-col items-stretch gap-1" : "space-y-1"
          }`}
        >
          {showBacklog && !collapsed && (
            <div className="mb-2 px-3 py-1.5 text-[11px] text-shelf-muted border-b border-shelf-border/50">
              {unwatched > 0 && <span>{unwatched} unwatched</span>}
              {unwatched > 0 && inProgress > 0 && <span> · </span>}
              {inProgress > 0 && <span>{inProgress} in progress</span>}
            </div>
          )}
          {desktopNav.map(({ href, label, icon: Icon }) => {
            const isActive = navItemIsActive(pathname, href);
            const link = (
              <Link
                href={href}
                prefetch={true}
                className={`flex items-center rounded-lg py-2.5 text-sm font-medium transition ${
                  collapsed ? "w-full justify-center px-0" : "gap-3 px-3"
                } ${
                  isActive
                    ? "bg-[#8b5cf6] text-white shadow-lg shadow-[#8b5cf6]/20"
                    : "text-shelf-muted hover:bg-shelf-card hover:text-white"
                }`}
              >
                <Icon size={20} className="shrink-0" />
                {!collapsed && label}
              </Link>
            );
            if (collapsed) {
              return (
                <Tooltip
                  key={href}
                  content={label}
                  placement="bottom"
                  className="flex w-full min-w-0 justify-center"
                >
                  {link}
                </Tooltip>
              );
            }
            return <Fragment key={href}>{link}</Fragment>;
          })}
        </nav>
        <div
          className={`border-t border-shelf-border shrink-0 w-full ${
            collapsed ? "p-2 flex justify-center" : "p-4"
          }`}
        >
          {!collapsed ? (
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
          ) : (
            <Tooltip
              content="Carter Family"
              placement="bottom"
              className="flex w-full justify-center"
            >
              <div className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[#8b5cf6] to-[#22d3ee] text-[11px] font-semibold text-white shadow-sm">
                CF
              </div>
            </Tooltip>
          )}
        </div>
      </aside>

      {/* Mobile Top Header */}
      <header className="md:hidden fixed top-0 left-0 right-0 z-50 h-14 bg-shelf-sidebar border-b border-shelf-border flex items-center gap-2 px-3">
        {pathname === "/plex" ? (
          <>
            <Link
              href="/settings"
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-shelf-muted transition hover:bg-shelf-card hover:text-white"
              aria-label="Back to Settings"
            >
              <ChevronLeft size={22} />
            </Link>
            <div className="flex min-w-0 flex-1 items-center gap-2">
              <WatchBoxLogo className="h-8 w-8 shrink-0" />
              <span className="truncate text-lg font-bold text-[#8b5cf6]">WatchBox</span>
            </div>
            {/* Balance back chevron so title stays visually centered */}
            <div className="h-10 w-10 shrink-0" aria-hidden />
          </>
        ) : (
          <>
            <div className="flex min-w-0 shrink-0 items-center gap-2">
              <WatchBoxLogo className="h-8 w-8 shrink-0" />
              <span className="truncate text-lg font-bold text-[#8b5cf6]">WatchBox</span>
            </div>
            <div className="flex min-w-0 flex-1 items-center justify-center gap-1">
              {isDisplayModePage(pathname) && <DisplayModeToggle />}
              {showReorder && (
                <Tooltip content={reorderMode ? "Done" : "Reorder"} placement="bottom">
                  <button
                    type="button"
                    onClick={() => setReorderMode((v) => !v)}
                    className={`flex shrink-0 items-center justify-center rounded-lg p-2 transition ${
                      reorderMode ? "bg-[#8b5cf6] text-white" : "text-shelf-muted hover:bg-shelf-card hover:text-white"
                    }`}
                    aria-label={reorderMode ? "Done reordering" : "Reorder list"}
                    aria-pressed={reorderMode}
                  >
                    {reorderMode ? <Check size={20} /> : <GripVertical size={20} />}
                  </button>
                </Tooltip>
              )}
            </div>
            {isMobileFiltersPage(pathname) && (
              <button
                type="button"
                onClick={toggle}
                className="flex shrink-0 items-center justify-center rounded-lg p-2 text-shelf-muted transition hover:bg-shelf-card hover:text-white"
                aria-label={
                  pathname === "/watching"
                    ? "Streamers and Plex sync"
                    : "Toggle filters and sections"
                }
              >
                <Menu size={22} />
              </button>
            )}
          </>
        )}
      </header>

      {/* Mobile Bottom Navigation — 5 fixed tabs; Movies/Series/Settings/Plex live under “More”. */}
      <nav
        className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-shelf-sidebar border-t border-shelf-border safe-area-pb"
        aria-label="Main navigation"
      >
        <div className="grid grid-cols-5 gap-0 px-1 pt-1.5 pb-2">
          {mobileTabs.map((tab) => {
            if (tab.kind === "link") {
              const active = tab.isActive(pathname);
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  prefetch={true}
                  className={`flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 min-h-[52px] transition ${
                    active ? "bg-[#8b5cf6]/20 text-[#8b5cf6]" : "text-shelf-muted hover:text-white"
                  }`}
                >
                  <tab.icon size={22} className="shrink-0" aria-hidden />
                  <span className="text-[10px] font-medium leading-tight text-center max-w-full truncate px-0.5">
                    {tab.label}
                  </span>
                </Link>
              );
            }
            const active = moreOpen || tab.isActive(pathname);
            return (
              <button
                key="more"
                type="button"
                onClick={() => setMoreOpen(true)}
                aria-expanded={moreOpen}
                aria-controls="mobile-more-sheet"
                className={`flex flex-col items-center justify-center gap-0.5 rounded-lg py-2 min-h-[52px] transition ${
                  active ? "bg-[#8b5cf6]/20 text-[#8b5cf6]" : "text-shelf-muted hover:text-white"
                }`}
              >
                <tab.icon size={22} className="shrink-0" aria-hidden />
                <span className="text-[10px] font-medium leading-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </nav>

      <MobileMoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </>
  );
}
