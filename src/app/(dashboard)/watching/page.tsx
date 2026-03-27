"use client";

import { useCallback, useEffect, useMemo, useState, Suspense } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { Loader2, Settings, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { useMediaList } from "@/contexts/MediaListContext";
import { useWhatNextCache } from "@/contexts/WhatNextCacheContext";
import type { WhatNextRow } from "@/lib/whatNext";
import { FilterBar } from "@/components/FilterBar";
import { MobileFiltersPanel } from "@/components/MobileFiltersPanel";
import { Tooltip } from "@/components/Tooltip";

const WatchingNextCarousel = dynamic(() => import("@/components/WatchingNextCarousel").then((m) => ({ default: m.WatchingNextCarousel })), {
  ssr: false,
  loading: () => (
    <div className="flex justify-center py-12">
      <Loader2 size={32} className="animate-spin text-cyan-400/90" />
    </div>
  ),
});

export default function WatchingPage() {
  const { list, loading: listLoading, refetch, optimisticUpdate, optimisticMoveToFront } = useMediaList();
  const { rows: cachedRows, status: cacheStatus, error: cacheErrorMessage, refresh, mergeRow } =
    useWhatNextCache();

  const rows = useMemo(() => cachedRows ?? [], [cachedRows]);
  const showWhatNextLoading = cacheStatus === "loading" && cachedRows === null;
  const loadError = cacheStatus === "error" && cachedRows === null;

  const [streamingServiceFilter, setStreamingServiceFilter] = useState<string | null>(null);
  const [marking, setMarking] = useState<string | null>(null);
  const [settingId, setSettingId] = useState<string | null>(null);
  const [setSeason, setSetSeason] = useState(1);
  const [setEpisode, setSetEpisode] = useState(1);
  const [seasonsData, setSeasonsData] = useState<{ season: number; episodeCount: number }[] | null>(null);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [seasonsError, setSeasonsError] = useState<string | null>(null);

  useEffect(() => {
    void refresh({ silent: true });
  }, [refresh]);

  useEffect(() => {
    if (!settingId) {
      setSeasonsData(null);
      setSeasonsError(null);
      return;
    }
    let cancelled = false;
    setSeasonsLoading(true);
    setSeasonsError(null);
    void fetch(`/api/media/${encodeURIComponent(settingId)}/tv-season-episodes`)
      .then(async (res) => {
        const data = (await res.json()) as { seasons?: { season: number; episodeCount: number }[]; error?: string };
        if (!res.ok) {
          throw new Error(typeof data.error === "string" ? data.error : "Could not load seasons");
        }
        if (!cancelled) setSeasonsData(data.seasons ?? []);
      })
      .catch((e: unknown) => {
        if (!cancelled) {
          setSeasonsData(null);
          setSeasonsError(e instanceof Error ? e.message : "Could not load seasons");
        }
      })
      .finally(() => {
        if (!cancelled) setSeasonsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [settingId]);

  const episodeMaxForSeason = useMemo(() => {
    if (!seasonsData?.length) return null;
    const row = seasonsData.find((s) => s.season === setSeason);
    const c = row?.episodeCount ?? 0;
    return c > 0 ? c : 1;
  }, [seasonsData, setSeason]);

  useEffect(() => {
    if (episodeMaxForSeason == null) return;
    setSetEpisode((e) => Math.min(Math.max(1, e), episodeMaxForSeason));
  }, [episodeMaxForSeason]);

  const mediaById = useMemo(() => new Map(list.map((m) => [m.id, m])), [list]);
  const watchingIds = useMemo(() => new Set(rows.map((r) => r.mediaId)), [rows]);

  const availableServices = useMemo(() => {
    const services = new Set<string>();
    for (const id of watchingIds) {
      const svc = mediaById.get(id)?.streamingService;
      if (svc) services.add(svc);
    }
    return Array.from(services).sort();
  }, [mediaById, watchingIds]);

  useEffect(() => {
    if (streamingServiceFilter && !availableServices.includes(streamingServiceFilter)) {
      setStreamingServiceFilter(null);
    }
  }, [availableServices, streamingServiceFilter]);

  const filteredRows = useMemo(() => {
    if (!streamingServiceFilter) return rows;
    return rows.filter((row) => {
      const svc = mediaById.get(row.mediaId)?.streamingService ?? null;
      return svc === streamingServiceFilter;
    });
  }, [rows, mediaById, streamingServiceFilter]);

  const resolveStreaming = useCallback(
    (mediaId: string) => mediaById.get(mediaId)?.streamingService ?? null,
    [mediaById]
  );

  const resolveMedia = useCallback(
    (mediaId: string) => mediaById.get(mediaId) ?? null,
    [mediaById]
  );

  const markWatched = useCallback(async (mediaId: string) => {
    setMarking(mediaId);
    try {
      const res = await fetch(`/api/media/${encodeURIComponent(mediaId)}/mark-episode-watched`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Could not update");
        return;
      }
      optimisticUpdate(mediaId, {
        manualLastWatchedSeason: data.manualLastWatchedSeason ?? null,
        manualLastWatchedEpisode: data.manualLastWatchedEpisode ?? null,
        sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
      });
      optimisticMoveToFront(mediaId);
      if (data.whatNextRow && typeof data.whatNextRow === "object") {
        mergeRow(data.whatNextRow as WhatNextRow);
      } else {
        void refresh({ silent: true });
      }
    } catch {
      toast.error("Network error — could not mark episode");
    } finally {
      setMarking(null);
    }
  }, [optimisticUpdate, optimisticMoveToFront, mergeRow, refresh]);

  const openSetPosition = useCallback((row: WhatNextRow) => {
    setSettingId(row.mediaId);
    if (row.lastFinished) {
      setSetSeason(row.lastFinished.season);
      setSetEpisode(row.lastFinished.episode);
    } else {
      setSetSeason(1);
      setSetEpisode(1);
    }
  }, []);

  const savePosition = async () => {
    if (!settingId) return;
    try {
      const res = await fetch(`/api/media/${encodeURIComponent(settingId)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          manualLastWatchedSeason: setSeason,
          manualLastWatchedEpisode: setEpisode,
        }),
      });
      if (!res.ok) {
        toast.error("Could not update position");
        return;
      }
      optimisticUpdate(settingId, {
        manualLastWatchedSeason: setSeason,
        manualLastWatchedEpisode: setEpisode,
      });
      setSettingId(null);
      await refresh({ silent: true });
      await refetch();
      toast.success("Position updated");
    } catch {
      toast.error("Update failed");
    }
  };

  const settingTitle = settingId ? mediaById.get(settingId)?.title ?? "Show" : "";

  const showFullLoading = listLoading || showWhatNextLoading;

  return (
    <div className="min-h-screen pb-8">
      <header className="sticky top-14 md:top-0 z-20 md:border-b border-shelf-border bg-shelf-bg/95 backdrop-blur relative h-0 min-h-0 overflow-visible md:h-auto md:min-h-0">
        <MobileFiltersPanel>
          <div className="px-4 md:px-6 py-3 border-b border-shelf-border md:border-b-0 bg-shelf-sidebar md:bg-transparent">
            <div className="flex items-center justify-between gap-3 min-w-0">
              <div className="min-w-0 flex-1">
                {availableServices.length > 0 ? (
                  <FilterBar
                    streamingService={streamingServiceFilter}
                    onStreamingServiceChange={setStreamingServiceFilter}
                    availableServices={availableServices}
                  />
                ) : (
                  <p className="text-xs text-shelf-muted md:text-sm">
                    Assign streaming services on Series to filter here.
                  </p>
                )}
              </div>
              <Tooltip content="Open Plex sync" placement="bottom">
                <Link
                  href="/plex"
                  className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-shelf-border bg-shelf-card/50 px-2.5 py-2 text-xs font-medium text-white/90 hover:bg-shelf-card transition"
                  aria-label="Plex sync"
                >
                  <Settings size={16} className="text-cyan-400/90 shrink-0" aria-hidden />
                  <span className="max-[380px]:sr-only">Plex sync</span>
                </Link>
              </Tooltip>
            </div>
          </div>
        </MobileFiltersPanel>
      </header>

      <div className="p-4 md:p-6">
        {showFullLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4">
            <Loader2 className="animate-spin text-cyan-400/90" size={40} aria-hidden />
            <p className="text-sm text-shelf-muted">Loading what to watch next…</p>
          </div>
        ) : loadError ? (
          <div className="rounded-2xl border border-shelf-border bg-shelf-card/80 p-8 text-center">
            <p className="text-shelf-muted mb-4">{cacheErrorMessage ?? "Could not load what to watch next."}</p>
            <button
              type="button"
              onClick={() => void refresh({ silent: false })}
              className="inline-flex items-center gap-2 rounded-xl bg-[#8b5cf6] px-4 py-2.5 text-sm font-medium text-white hover:bg-[#9b7df0]"
            >
              <Loader2 size={16} />
              Try again
            </button>
          </div>
        ) : filteredRows.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-shelf-border bg-shelf-card/40 px-6 py-16 text-center">
            <Sparkles className="mx-auto mb-3 text-shelf-muted" size={32} />
            <p className="text-shelf-muted text-sm max-w-md mx-auto">
              No in-progress TV shows with a resolvable next episode. Add series and mark progress from the Series
              page, or sync from Plex.
            </p>
            <Link
              href="/series"
              className="inline-flex mt-6 text-sm font-medium text-[#a78bfa] hover:text-white transition"
            >
              Go to Series
            </Link>
          </div>
        ) : (
          <WatchingNextCarousel
            rows={filteredRows}
            marking={marking}
            onMarkWatched={markWatched}
            onOpenSetPosition={openSetPosition}
            resolveStreaming={resolveStreaming}
            resolveMedia={resolveMedia}
          />
        )}
      </div>

      {settingId != null && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70"
          role="dialog"
          aria-modal
          aria-labelledby="set-position-title"
          onClick={() => setSettingId(null)}
        >
          <div
            className="w-full max-w-sm rounded-2xl border border-shelf-border bg-shelf-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 id="set-position-title" className="text-lg font-semibold text-white mb-1">
              Set last watched
            </h2>
            <p className="text-sm text-shelf-muted mb-4 line-clamp-2">{settingTitle}</p>
            {seasonsLoading ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10">
                <Loader2 className="animate-spin text-cyan-400/90" size={28} aria-hidden />
                <p className="text-xs text-shelf-muted">Loading seasons from TMDB…</p>
              </div>
            ) : seasonsData && seasonsData.length > 0 && episodeMaxForSeason != null ? (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex-1 min-w-0">
                  <span className="text-xs text-shelf-muted">Season</span>
                  <select
                    className="mt-1 w-full cursor-pointer rounded-lg border border-shelf-border bg-shelf-bg px-3 py-2.5 text-sm text-white"
                    value={setSeason}
                    onChange={(e) => setSetSeason(Number(e.target.value) || 1)}
                  >
                    {seasonsData.map(({ season }) => (
                      <option key={season} value={season}>
                        Season {season}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="flex-1 min-w-0">
                  <span className="text-xs text-shelf-muted">Episode</span>
                  <select
                    className="mt-1 w-full cursor-pointer rounded-lg border border-shelf-border bg-shelf-bg px-3 py-2.5 text-sm text-white"
                    value={setEpisode}
                    onChange={(e) => setSetEpisode(Number(e.target.value) || 1)}
                  >
                    {Array.from({ length: episodeMaxForSeason }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        Episode {n}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            ) : (
              <>
                {seasonsError ? (
                  <p className="mb-3 text-xs text-amber-200/90">{seasonsError}</p>
                ) : null}
                <p className="mb-2 text-xs text-shelf-muted">Enter season and episode manually.</p>
                <div className="flex gap-3 items-end">
                  <label className="flex-1">
                    <span className="text-xs text-shelf-muted">Season</span>
                    <input
                      type="number"
                      min={1}
                      className="mt-1 w-full rounded-lg border border-shelf-border bg-shelf-bg px-3 py-2 text-white"
                      value={setSeason}
                      onChange={(e) => setSetSeason(Number(e.target.value) || 1)}
                    />
                  </label>
                  <label className="flex-1">
                    <span className="text-xs text-shelf-muted">Episode</span>
                    <input
                      type="number"
                      min={1}
                      className="mt-1 w-full rounded-lg border border-shelf-border bg-shelf-bg px-3 py-2 text-white"
                      value={setEpisode}
                      onChange={(e) => setSetEpisode(Number(e.target.value) || 1)}
                    />
                  </label>
                </div>
              </>
            )}
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                className="rounded-lg px-3 py-2 text-sm text-shelf-muted hover:text-white"
                onClick={() => setSettingId(null)}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={seasonsLoading}
                className="rounded-lg bg-[#8b5cf6] px-4 py-2 text-sm font-medium text-white hover:bg-[#9b7df0] disabled:opacity-50"
                onClick={() => void savePosition()}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
