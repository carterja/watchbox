"use client";

import { useMobileFilters } from "@/contexts/MobileFiltersContext";

const SLIDE_DURATION_MS = 500;

/**
 * Wraps page header filter/section content. On mobile, slides up/down based on
 * the burger menu state and overlays content (does not push down). Uses
 * transform for GPU-accelerated slide; max-height for reveal. On desktop (md+) always visible in flow.
 */
export function MobileFiltersPanel({ children }: { children: React.ReactNode }) {
  const { open } = useMobileFilters();
  return (
    <div
      className={`
        absolute top-0 left-0 right-0 z-20 bg-shelf-bg/98 backdrop-blur border-b border-shelf-border
        md:relative md:top-auto md:left-auto md:right-auto md:z-auto md:bg-transparent md:backdrop-blur-none md:border-0
        overflow-hidden
        transition-[max-height] ease-in-out
        ${open ? "max-h-[70vh]" : "max-h-0"} md:max-h-none md:overflow-visible
      `}
      style={{ transitionDuration: `${SLIDE_DURATION_MS}ms` }}
    >
      <div
        className={`
          transition-transform ease-in-out
          md:translate-y-0
          ${open ? "translate-y-0" : "-translate-y-full"}
        `}
        style={{ transitionDuration: `${SLIDE_DURATION_MS}ms` }}
      >
        <div className="overflow-y-auto overflow-x-auto max-h-[70vh] md:max-h-none md:overflow-visible">
          {children}
        </div>
      </div>
    </div>
  );
}
