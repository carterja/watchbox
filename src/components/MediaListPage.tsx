"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import { MediaCard } from "@/components/MediaCard";
import { MediaDetailModal } from "@/components/MediaDetailModal";
import { VirtualizedMediaGrid } from "@/components/VirtualizedMediaGrid";
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { list, loading, refetch, optimisticReorder } = useMediaList();
  const { handleDelete, handleUpdate } = useMediaMutations();

  const openId = searchParams.get("open");
  const deepLinkMedia = useMemo(() => {
    if (!openId) return null;
    return (
      list.find((m) => {
        if (m.id !== openId) return false;
        if (typeFilter === "movie") return m.type === "movie";
        if (typeFilter === "tv") return m.type === "tv";
        return true;
      }) ?? null
    );
  }, [openId, list, typeFilter]);

  const showDeepLinkModal = Boolean(openId && deepLinkMedia);

  const clearOpenParam = useCallback(() => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete("open");
    const q = params.toString();
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
  }, [router, searchParams, pathname]);
  
  // Initialize from URL params, fallback to defaults
  const [statusFilter, setStatusFilter] = useState<StatusFilterValue>(() => {
    const param = searchParams.get("status");
    return (param as StatusFilterValue) || "all";
  });
  const [streamingServiceFilter, setStreamingServiceFilter] = useState<string | null>(() => {
    return searchParams.get("service") || null;
  });
  const [viewerFilter, setViewerFilter] = useState<Viewer | null>(() => {
    const param = searchParams.get("viewer");
    return (param as Viewer) || null;
  });

  // Sync filters to URL on change (preserve ?open= from current location — avoid looping on searchParams)
  useEffect(() => {
    const params = new URLSearchParams();
    if (statusFilter !== "all") params.set("status", statusFilter);
    if (streamingServiceFilter) params.set("service", streamingServiceFilter);
    if (viewerFilter) params.set("viewer", viewerFilter);
    if (typeof window !== "undefined") {
      const open = new URLSearchParams(window.location.search).get("open");
      if (open) params.set("open", open);
    }
    const query = params.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  }, [statusFilter, streamingServiceFilter, viewerFilter, router, pathname]);

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

  useEffect(() => {
    if (!openId || !deepLinkMedia || loading) return;
    const id = requestAnimationFrame(() => {
      document
        .querySelector(`[data-media-card-id="${openId}"]`)
        ?.scrollIntoView({ block: "center", behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [openId, deepLinkMedia, loading]);

  const renderItem = useCallback(
    (m: Media, reorderMode = false) => (
      <MediaCard
        media={m}
        onDelete={handleDelete}
        onUpdate={handleUpdate}
        showTypeTag={showTypeTag}
        variant={isList ? "list" : "card"}
        reorderMode={reorderMode}
        suppressClickModal={showDeepLinkModal && openId === m.id}
      />
    ),
    [handleDelete, handleUpdate, showTypeTag, isList, showDeepLinkModal, openId]
  );

  const fullOrderedIds = useMemo(() => list.map((m) => m.id), [list]);

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
            fullOrderedIds={fullOrderedIds}
            filteredItems={filtered}
            optimisticReorder={optimisticReorder}
            refetch={refetch}
            containerClass={containerClass}
            isList={isList}
            renderItem={renderItem}
          />
        ) : (
          <VirtualizedMediaGrid
            items={filtered}
            renderItem={renderItem}
            containerClass={containerClass}
          />
        )}
      </div>

      {showDeepLinkModal && deepLinkMedia && (
        <MediaDetailModal
          key={deepLinkMedia.id}
          media={deepLinkMedia}
          onClose={clearOpenParam}
          onUpdate={async (patch) => {
            await handleUpdate(deepLinkMedia.id, patch);
          }}
          onDelete={() => handleDelete(deepLinkMedia.id)}
        />
      )}
    </div>
  );
}
