"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { MediaCard } from "@/components/MediaCard";
import { StatusToggle } from "@/components/StatusToggle";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { FilterBar } from "@/components/FilterBar";
import { MobileFiltersPanel } from "@/components/MobileFiltersPanel";
import { DisplayModeToggle } from "@/components/DisplayModeToggle";
import { useDisplayMode, getMediaListContainerClass } from "@/contexts/DisplayModeContext";
import type { Media, MediaStatus, SeasonProgressItem } from "@/types/media";

export default function MoviesPage() {
  const [list, setList] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
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
    console.log("MoviesPage handleUpdate - id:", id, "patch:", JSON.stringify(patch, null, 2));
    const res = await fetch(`/api/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    console.log("MoviesPage handleUpdate - response status:", res.status);
    if (res.ok) {
      const data = await res.json();
      console.log("MoviesPage handleUpdate - response data:", JSON.stringify(data, null, 2));
      await fetchList();
    } else {
      const error = await res.json();
      console.error("MoviesPage handleUpdate - error:", error);
    }
  };

  const movies = useMemo(() => list.filter((m) => m.type === "movie"), [list]);
  
  // Only show streamer filters that have at least one item assigned (hide when none)
  const availableServices = useMemo(() => {
    const services = new Set(
      movies
        .filter((m) => m.streamingService)
        .map((m) => m.streamingService as string)
    );
    return Array.from(services).sort();
  }, [movies]);
  
  // Apply filters
  const filtered = useMemo(() => {
    return movies.filter((m) => {
      if (m.status !== statusFilter) return false;
      if (streamingServiceFilter && m.streamingService !== streamingServiceFilter) return false;
      if (viewerFilter && m.viewer !== viewerFilter) return false;
      return true;
    });
  }, [movies, statusFilter, streamingServiceFilter, viewerFilter]);

  return (
    <div className="min-h-screen">
      <header className="sticky top-14 md:top-0 z-20 md:border-b border-shelf-border bg-shelf-bg/95 backdrop-blur relative h-0 min-h-0 overflow-visible md:h-auto md:min-h-0">
        <div className="hidden md:flex md:justify-end md:px-4 md:py-2 md:border-b md:border-shelf-border">
          <DisplayModeToggle />
        </div>
        <MobileFiltersPanel>
          <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col gap-3 md:gap-4">
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
    </div>
  );
}
