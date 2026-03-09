"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { AddMediaModal } from "@/components/AddMediaModal";
import { MediaCard } from "@/components/MediaCard";
import { StatusToggle } from "@/components/StatusToggle";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { FilterBar } from "@/components/FilterBar";
import type { Media, MediaStatus, SeasonProgressItem } from "@/types/media";

export default function SeriesPage() {
  const [list, setList] = useState<Media[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<MediaStatus>("yet_to_start");
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

  const handleStatusChange = async (id: string, status: MediaStatus) => {
    const res = await fetch(`/api/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await fetchList();
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Remove this from your list?")) return;
    const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
    if (res.ok) await fetchList();
  };

  const handleUpdate = async (
    id: string,
    patch: { progressNote?: string; totalSeasons?: number; seasonProgress?: SeasonProgressItem[] }
  ) => {
    const res = await fetch(`/api/media/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (res.ok) await fetchList();
  };

  const series = useMemo(() => list.filter((m) => m.type === "tv"), [list]);
  
  // Get unique streaming services
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
      <header className="sticky top-0 z-20 border-b border-shelf-border bg-shelf-bg/95 backdrop-blur">
        <div className="px-6 py-4 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-semibold text-shelf-accent">Series</h1>
            <button
              type="button"
              onClick={() => setModalOpen(true)}
              className="rounded-lg bg-shelf-accent px-4 py-2 text-white font-medium hover:bg-shelf-accent-hover transition"
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
      </header>

      <div className="p-6">
        {loading ? (
          <LoadingSkeleton count={14} type="grid" />
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 xl:grid-cols-7 gap-4">
            {filtered.length === 0 ? (
              <p className="col-span-full text-shelf-muted py-8">
                Nothing matches the selected filters.
              </p>
            ) : (
              filtered.map((m) => (
                <MediaCard
                  key={m.id}
                  media={m}
                  onStatusChange={handleStatusChange}
                  onDelete={handleDelete}
                  onUpdate={handleUpdate}
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
          defaultStatus="yet_to_start"
          typeFilter="tv"
        />
      )}
    </div>
  );
}
