"use client";

import { useState, useMemo, useCallback } from "react";
import dynamic from "next/dynamic";
import { MediaCard } from "@/components/MediaCard";
import { type StatusFilterValue } from "@/components/UnifiedCategoryBar";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { MediaListPageHeader } from "@/components/MediaListPageHeader";
import { toast } from "sonner";
import { useDisplayMode, getMediaListContainerClass } from "@/contexts/DisplayModeContext";
import { useMediaList } from "@/contexts/MediaListContext";
import { useReorderMode } from "@/contexts/ReorderModeContext";
import type { Media, MediaStatus, SeasonProgressItem, Viewer } from "@/types/media";

const SortableMediaList = dynamic(
  () => import("@/components/SortableMediaList").then((m) => ({ default: m.SortableMediaList })),
  { ssr: false }
);

export default function AllPage() {
  const { list, loading, refetch, optimisticUpdate, optimisticRemove } = useMediaList();
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [streamingServiceFilter, setStreamingServiceFilter] = useState<string | null>(null);
  const [viewerFilter, setViewerFilter] = useState<Viewer | null>(null);
  const { reorderMode, setReorderMode } = useReorderMode();
  const { displayMode } = useDisplayMode();
  const containerClass = getMediaListContainerClass(displayMode);
  const isList = displayMode === "compact";

  const handleDelete = useCallback(
    async (id: string) => {
      if (!confirm("Remove this from your list?")) return;
      optimisticRemove(id);
      try {
        const res = await fetch(`/api/media/${id}`, { method: "DELETE" });
        if (res.ok) {
          toast.success("Removed");
        } else {
          await refetch();
          toast.error("Could not remove");
        }
      } catch {
        await refetch();
        toast.error("Could not remove");
      }
    },
    [refetch, optimisticRemove]
  );

  const handleUpdate = useCallback(
    async (
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
      optimisticUpdate(id, patch);
      try {
        const res = await fetch(`/api/media/${id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patch),
        });
        if (res.ok) {
          await refetch();
          if (patch.status === "finished") toast.success("Marked as finished");
          else toast.success("Updated");
        } else {
          await refetch();
          toast.error("Could not update");
        }
      } catch {
        await refetch();
        toast.error("Could not update");
      }
    },
    [refetch, optimisticUpdate]
  );

  // Only show streamer filters that have at least one item assigned (hide when none)
  const availableServices = useMemo(() => {
    const services = new Set(
      list
        .filter((m) => m.streamingService)
        .map((m) => m.streamingService as string)
    );
    return Array.from(services).sort();
  }, [list]);

  const filtered = useMemo(() => {
    return list.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (streamingServiceFilter && m.streamingService !== streamingServiceFilter) return false;
      if (viewerFilter && m.viewer !== viewerFilter) return false;
      return true;
    });
  }, [list, statusFilter, streamingServiceFilter, viewerFilter]);

  return (
    <div className="min-h-screen">
      <MediaListPageHeader
        loading={loading}
        hasFilteredItems={filtered.length > 0}
        reorderMode={reorderMode}
        setReorderMode={setReorderMode}
        statusFilter={statusFilter}
        onStatusChange={setStatusFilter}
        viewerFilter={viewerFilter}
        onViewerChange={setViewerFilter}
        streamingServiceFilter={streamingServiceFilter}
        onStreamingServiceChange={setStreamingServiceFilter}
        availableServices={availableServices}
      />

      <div className="p-4 md:p-6">
        {loading ? (
          isList ? (
            <LoadingSkeleton count={14} type="list" />
          ) : (
            <LoadingSkeleton count={14} type="grid" gridClassName={containerClass} />
          )
        ) : filtered.length === 0 ? (
          <div className={containerClass}>
            <p className={isList ? "text-shelf-muted py-8 text-center text-sm" : "col-span-full text-shelf-muted py-8 text-center text-sm"}>
                No titles match your filters. Try changing status or viewer.
              </p>
          </div>
        ) : reorderMode ? (
          <SortableMediaList
            fullOrderedIds={list.map((m) => m.id)}
            filteredItems={filtered}
            onReorderSuccess={async () => {
              await refetch();
              toast.success("Order saved");
            }}
            containerClass={containerClass}
            isList={isList}
            renderItem={(m) => (
              <MediaCard
                media={m}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                showTypeTag={true}
                variant={isList ? "list" : "card"}
              />
            )}
          />
        ) : (
          <div className={containerClass}>
            {filtered.map((m) => (
              <MediaCard
                key={m.id}
                media={m}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                showTypeTag={true}
                variant={isList ? "list" : "card"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
