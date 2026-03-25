"use client";

import type { Dispatch, SetStateAction } from "react";
import { UnifiedCategoryBar, type StatusFilterValue } from "@/components/UnifiedCategoryBar";
import { FilterBar } from "@/components/FilterBar";
import { MobileFiltersPanel } from "@/components/MobileFiltersPanel";
import { DisplayModeToggle } from "@/components/DisplayModeToggle";
import { GripVertical, Check } from "lucide-react";
import type { Viewer } from "@/types/media";

export type MediaListPageHeaderProps = {
  loading: boolean;
  hasFilteredItems: boolean;
  reorderMode: boolean;
  setReorderMode: Dispatch<SetStateAction<boolean>>;
  statusFilter: StatusFilterValue;
  onStatusChange: (v: StatusFilterValue) => void;
  viewerFilter: Viewer | null;
  onViewerChange: (v: Viewer | null) => void;
  streamingServiceFilter: string | null;
  onStreamingServiceChange: (v: string | null) => void;
  availableServices: string[];
};

const filterBarProps = (p: MediaListPageHeaderProps) => ({
  streamingService: p.streamingServiceFilter,
  onStreamingServiceChange: p.onStreamingServiceChange,
  availableServices: p.availableServices,
});

/**
 * Shared sticky header for All / Movies / Series: on md+, two rows (streamers + toolbar, then category bar).
 * Mobile: unchanged drawer stack (category then streamers).
 */
export function MediaListPageHeader(p: MediaListPageHeaderProps) {
  const fb = filterBarProps(p);

  return (
    <header className="sticky top-14 md:top-0 z-20 md:border-b border-shelf-border bg-shelf-bg/95 backdrop-blur relative h-0 min-h-0 overflow-visible md:h-auto md:min-h-0">
      <MobileFiltersPanel>
        <div className="flex flex-col">
          {/* Desktop: streamers left, reorder + display mode right */}
          <div className="hidden md:flex md:min-h-[3.25rem] md:items-center md:justify-between md:gap-4 md:px-6 md:py-2 md:border-b md:border-shelf-border">
            <div className="min-w-0 flex-1">
              {p.availableServices.length > 0 ? <FilterBar {...fb} /> : null}
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {!p.loading && p.hasFilteredItems && (
                <button
                  type="button"
                  onClick={() => p.setReorderMode((v) => !v)}
                  className={`flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition ${
                    p.reorderMode ? "bg-[#8b5cf6] text-white" : "text-shelf-muted hover:bg-shelf-card hover:text-white"
                  }`}
                >
                  {p.reorderMode ? <Check size={16} /> : <GripVertical size={16} />}
                  {p.reorderMode ? "Done" : "Reorder"}
                </button>
              )}
              <DisplayModeToggle />
            </div>
          </div>

          <div className="bg-shelf-sidebar border-b border-shelf-border px-4 md:px-6 py-2 md:py-2.5">
            <UnifiedCategoryBar
              statusFilter={p.statusFilter}
              onStatusChange={p.onStatusChange}
              viewerFilter={p.viewerFilter}
              onViewerChange={p.onViewerChange}
            />
          </div>

          {/* Mobile drawer: streamers below category */}
          <div className="px-4 py-3 md:hidden">
            <FilterBar {...fb} />
          </div>
        </div>
      </MobileFiltersPanel>
    </header>
  );
}
