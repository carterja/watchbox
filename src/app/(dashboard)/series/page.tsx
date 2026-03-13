"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AddMediaModal } from "@/components/AddMediaModal";
import { MediaCard } from "@/components/MediaCard";
import { StatusToggle } from "@/components/StatusToggle";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { FilterBar } from "@/components/FilterBar";
import { MobileFiltersPanel } from "@/components/MobileFiltersPanel";
import { DisplayModeToggle } from "@/components/DisplayModeToggle";
import { useDisplayMode, getMediaListContainerClass } from "@/contexts/DisplayModeContext";
import type { Media, MediaStatus, SeasonProgressItem } from "@/types/media";

export default function SeriesPage() {
  const [list, setList] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MediaStatus>("in_progress");
  const [streamingServiceFilter, setStreamingServiceFilter] = useState<string | null>(null);
  const [viewerFilter, setViewerFilter] = useState<string | null>(null);
  const { displayMode } = useDisplayMode();
  const containerClass = getMediaListContainerClass(displayMode);
  const isList = displayMode === "compact";

  const fetchList = useCallback(async () => {
    const res = await fetch("/api/media");
    const data = await res.json();
    setList(Array.isArray(data) ? data : []);
  }, []);

  useEffect(() => {
    fetchList().finally(() => setLoading(false));
  }, [fetchList]);

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this from your list?")) return;
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (res.ok) await fetchList();
  };

  const handleUpdate = async (
    id: string,
    patch: { 
      progressNote?: string; 
      totalSeasons?: number; 
      seasonProgress?: SeasonProgressItem[];
      streamingService?: string | null;
      viewer?: import("@/types/media").Viewer | null;
      posterPath?: string | null;
      status?: MediaStatus;
    }
  ) => {
    console.log("SeriesPage handleUpdate - id:", id, "patch:", JSON.stringify(patch, null, 2));
    const res = await fetch(`/api/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    console.log("SeriesPage handleUpdate - response status:", res.status);
    if (res.ok) {
      const data = await res.json();
      console.log("SeriesPage handleUpdate - response data:", JSON.stringify(data, null, 2));
      await fetchList();
    } else {
      const error = await res.json();
      console.error("SeriesPage handleUpdate - error:", error);
    }
  };

  const series = useMemo(() => list.filter((m) => m.type === "tv"), [list]);
  
  // Only show streamer filters that have at least one item assigned (hide HBO etc. when none)
  const availableServices = useMemo(() => {
    const services = new Set(
      series
        .filter((m) => m.streamingService)
        .map((m) => m.streamingService as string)
    );
    return Array.from(services).sort();
  }, [series]);
  
  // Apply filters
  const filtered = useMemo(() => {
    return series.filter((m) => {
      if (m.status !== statusFilter) return false;
      if (streamingServiceFilter && m.streamingService !== streamingServiceFilter) return false;
      if (viewerFilter && m.viewer !== viewerFilter) return false;
      return true;
    });
  }, [series, statusFilter, streamingServiceFilter, viewerFilter]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-14 md:top-0 z-20 md:border-b border-shelf-border bg-shelf-bg/95 backdrop-blur relative h-0 min-h-0 overflow-visible md:h-auto md:min-h-0">
        <div className="hidden md:flex md:justify-end md:px-4 md:py-2 md:border-b md:border-shelf-border">
          <DisplayModeToggle />
        </div>
        <MobileFiltersPanel>
          <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col gap-3 md:gap-4">
            <div className="flex items-center justify-between">
              <h1 className="text-xl md:text-2xl font-semibold text-shelf-accent">Series</h1>
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="rounded-lg bg-shelf-accent px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base text-white font-medium hover:bg-shelf-accent-hover transition"
              >
                Add series
              </button>
            </div>
            <StatusToggle value={statusFilter} onChange={setStatusFilter} />
            <FilterBar
              streamingService={streamingServiceFilter}
              onStreamingServiceChange={setStreamingServiceFilter}
              viewer={viewerFilter}
              onViewerChange={setViewerFilter}
              availableServices={availableServices}
            />
          </div>
        </MobileFiltersPanel>
      </header>

      <div className="p-4 md:p-6">
        {loading ? (
          isList ? (
            <LoadingSkeleton count={14} type="list" />
          ) : (
            <LoadingSkeleton count={14} type="grid" gridClassName={containerClass} />
          )
        ) : (
          <div className={containerClass}>
            {filtered.length === 0 ? (
              <p className={isList ? "text-shelf-muted py-8 text-center" : "col-span-full text-shelf-muted py-8 text-center"}>
                Nothing matches the selected filters.
              </p>
            ) : (
              filtered.map((m) => (
                <MediaCard
                  key={m.id}
                  media={m}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
                  showTypeTag={false}
                  variant={isList ? "list" : "card"}
                />
              ))
            )}
          </div>
        )}
      </div>

      {modalOpen && (
        <AddMediaModal
          onClose={() => setModalOpen(false)}
          onAdded={() => { fetchList(); setModalOpen(false); }}
          defaultStatus="in_progress"
          typeFilter="tv"
        />
      )}
    </div>
  );
}
