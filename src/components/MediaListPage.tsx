"use client";

import { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { MediaCard } from "@/components/MediaCard";
import { type StatusFilterValue } from "@/components/UnifiedCategoryBar";
import { LoadingSkeleton } from "@/components/LoadingSkeleton";
import { MediaListPageHeader } from "@/components/MediaListPageHeader";
import { useDisplayMode, getMediaListContainerClass } from "@/contexts/DisplayModeContext";
import { useMediaList } from "@/contexts/MediaListContext";
import { useReorderMode } from "@/contexts/ReorderModeContext";
import { useMediaMutations } from "@/hooks/useMediaMutations";
import type { Media, Viewer } from "@/types/media";

const SortableMediaList = dynamic(
  () =>
    import("@/components/SortableMediaList").then((m) => ({
      default: m.SortableMediaList,
    })),
  { ssr: false }
);

type Props = {
  /** Filter list to this media type, or show all when omitted. */
  typeFilter?: "movie" | "tv";
  /** Show Movie/Series pill on cards (true for "All" page). */
  showTypeTag?: boolean;
  /** Empty-state noun, e.g. "titles", "movies", "series". */
  emptyNoun?: string;
};

export function MediaListPage({
  typeFilter,
  showTypeTag = false,
  emptyNoun = "titles",
}: Props) {
  const { list, loading, refetch, optimisticReorder } = useMediaList();
  const { handleDelete, handleUpdate } = useMediaMutations();
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>("all");
  const [streamingServiceFilter, setStreamingServiceFilter] = useState<
    string | null
  >(null);
  const [viewerFilter, setViewerFilter] = useState<Viewer | null>(null);
  const { reorderMode, setReorderMode } = useReorderMode();
  const { displayMode } = useDisplayMode();
  const containerClass = getMediaListContainerClass(displayMode);
  const isList = displayMode === "compact";

  const typeFiltered = useMemo(
    () => (typeFilter ? list.filter((m) => m.type === typeFilter) : list),
    [list, typeFilter]
  );

  const availableServices = useMemo(() => {
    const services = new Set(
      typeFiltered
        .filter((m) => m.streamingService)
        .map((m) => m.streamingService as string)
    );
    return Array.from(services).sort();
  }, [typeFiltered]);

  const filtered = useMemo(() => {
    return typeFiltered.filter((m) => {
      if (statusFilter !== "all" && m.status !== statusFilter) return false;
      if (
        streamingServiceFilter &&
        m.streamingService !== streamingServiceFilter
      )
        return false;
      if (viewerFilter && m.viewer !== viewerFilter) return false;
      return true;
    });
  }, [typeFiltered, statusFilter, streamingServiceFilter, viewerFilter]);

  const renderItem = (m: Media, isReordering = false) => (
    <MediaCard
      media={m}
      onDelete={handleDelete}
      onUpdate={handleUpdate}
      showTypeTag={showTypeTag}
      variant={isList ? "list" : "card"}
      reorderMode={isReordering}
    />
  );

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
            <LoadingSkeleton
              count={14}
              type="grid"
              gridClassName={containerClass}
            />
          )
        ) : filtered.length === 0 ? (
          <div className={containerClass}>
            <p
              className={
                isList
                  ? "text-shelf-muted py-8 text-center text-sm"
                  : "col-span-full text-shelf-muted py-8 text-center text-sm"
              }
            >
              No {emptyNoun} match your filters. Try changing status or viewer.
            </p>
          </div>
        ) : reorderMode ? (
          <SortableMediaList
            fullOrderedIds={list.map((m) => m.id)}
            filteredItems={filtered}
            optimisticReorder={optimisticReorder}
            refetch={refetch}
            containerClass={containerClass}
            isList={isList}
            renderItem={renderItem}
          />
        ) : (
          <div className={containerClass}>
            {filtered.map((m) => (
              <MediaCard
                key={m.id}
                media={m}
                onDelete={handleDelete}
                onUpdate={handleUpdate}
                showTypeTag={showTypeTag}
                variant={isList ? "list" : "card"}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
