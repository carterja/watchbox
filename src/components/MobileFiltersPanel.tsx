"use client";

import { useMobileFilters } from "@/contexts/MobileFiltersContext";

/**
 * Wraps page header filter/section content. On mobile, slides up/down based on
 * the burger menu state and overlays content (does not push down). On desktop (md+) always visible in flow.
 */
export function MobileFiltersPanel({ children }: { children: React.ReactNode }) {
  const { open } = useMobileFilters();
  return (
    <div
      className={`
        absolute top-0 left-0 right-0 z-20 bg-shelf-bg/98 backdrop-blur border-b border-shelf-border
        md:relative md:top-auto md:left-auto md:right-auto md:z-auto md:bg-transparent md:backdrop-blur-none md:border-0
        overflow-hidden transition-[max-height] duration-500 ease-in-out
        ${open ? "max-h-[70vh]" : "max-h-0"} md:max-h-none md:overflow-visible
      `}
    >
      <div className="overflow-y-auto overflow-x-hidden max-h-[70vh] md:max-h-none md:overflow-visible">
        {children}
      </div>
    </div>
  );
}
