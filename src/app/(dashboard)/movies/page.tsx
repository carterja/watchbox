"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AddMediaModal } from "@/components/AddMediaModal";
import { MediaCard } from "@/components/MediaCard";
import { StatusToggle } from "@/components/StatusToggle";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { FilterBar } from "@/components/FilterBar";
import type { Media, MediaStatus, SeasonProgressItem } from "@/types/media";

export default function MoviesPage() {
  const [list, setList] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MediaStatus>("in_progress");
  const [streamingServiceFilter, setStreamingServiceFilter] = useState<string | null>(null);
  const [viewerFilter, setViewerFilter] = useState<string | null>(null);

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
      <header className="sticky top-14 md:top-0 z-20 border-b border-shelf-border bg-shelf-bg/95 backdrop-blur">
        <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col gap-3 md:gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-xl md:text-2xl font-semibold text-shelf-accent">Movies</h1>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-lg bg-shelf-accent px-3 md:px-4 py-1.5 md:py-2 text-sm md:text-base text-white font-medium hover:bg-shelf-accent-hover transition"
            >
              Add movie
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
      </header>

      <div className="p-4 md:p-6">
        {loading ? (
          <LoadingSkeleton count={14} type="grid" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 2xl:grid-cols-7 gap-3 md:gap-4">
            {filtered.length === 0 ? (
              <p className="col-span-full text-shelf-muted py-8 text-center">
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
          typeFilter="movie"
        />
      )}
    </div>
  );
}
