"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Loader2,
  MonitorPlay,
  RefreshCw,
  Film,
  Tv,
  AlertCircle,
  CheckCircle2,
  Library,
  CloudOff,
  ArrowRight,
  Sparkles,
  Plus,
  Info,
} from "lucide-react";
import { PlexMarkIcon } from "@/components/icons/PlexMarkIcon";
import { PlexTmdbMatchModal } from "@/components/PlexTmdbMatchModal";
import { toast } from "sonner";
import { useMediaList } from "@/contexts/MediaListContext";
import { plexOnDeckRowKey, type PlexOnDeckItem } from "@/lib/plex";
import { posterUrl } from "@/lib/tmdb";
import {
  computeWatchingMatches,
  progressNoteFromPlex,
  type WatchingMatch,
} from "@/lib/watching";
import type { Media } from "@/types/media";

type StatusState =
  | { loading: true }
  | { loading: false; configured: false; message?: string }
  | { loading: false; configured: true; reachable: boolean; message?: string };

type AppHealth = { ok: boolean; db: boolean; plex?: boolean } | null;

type PlexPanelTab = "both" | "watchbox" | "plexonly";
type PlexOnlyKind = "tv" | "movies";

function formatProgress(viewOffset?: number, duration?: number): string {
  if (duration == null || duration <= 0) return "—";
  const pct = viewOffset != null ? Math.min(100, Math.round((viewOffset / duration) * 100)) : 0;
  const cur = viewOffset != null ? formatClock(viewOffset) : "0:00";
  const total = formatClock(duration);
  return `${pct}% · ${cur} / ${total}`;
}

function formatClock(ms: number): string {
  const s = Math.floor(ms / 1000);
  const m = Math.floor(s / 60);
  const h = Math.floor(m / 60);
  const mm = m % 60;
  const ss = s % 60;
  if (h > 0) return `${h}:${String(mm).padStart(2, "0")}:${String(ss).padStart(2, "0")}`;
  return `${m}:${String(ss).padStart(2, "0")}`;
}

function PlexBar({ viewOffset, duration }: { viewOffset?: number; duration?: number }) {
  const pct =
    duration && duration > 0 && viewOffset != null
      ? Math.min(100, Math.round((viewOffset / duration) * 100))
      : 0;
  return (
    <div>
      <div className="h-1.5 w-full rounded-full bg-shelf-border overflow-hidden">
        <div className="h-full rounded-full bg-cyan-500/80" style={{ width: `${pct}%` }} />
      </div>
      <p className="text-[11px] text-shelf-muted mt-0.5">{formatProgress(viewOffset, duration)}</p>
    </div>
  );
}

function PlexPlayback({ item }: { item: PlexOnDeckItem }) {
  if (
    item.type === "show" &&
    item.viewedLeafCount != null &&
    item.leafCount != null &&
    item.leafCount > 0
  ) {
    const pct = Math.min(100, Math.round((item.viewedLeafCount / item.leafCount) * 100));
    return (
      <div>
        <div className="h-1.5 w-full rounded-full bg-shelf-border overflow-hidden">
          <div className="h-full rounded-full bg-cyan-500/80" style={{ width: `${pct}%` }} />
        </div>
        <p className="text-[11px] text-shelf-muted mt-0.5">
          {item.viewedLeafCount} / {item.leafCount} episodes watched (library)
        </p>
      </div>
    );
  }
  if (item.viewOffset != null && item.duration != null && item.duration > 0) {
    return <PlexBar viewOffset={item.viewOffset} duration={item.duration} />;
  }
  return <p className="text-xs text-shelf-muted">No playback position</p>;
}

function MediaThumb({ media }: { media: Media }) {
  const src = media.posterPath ? posterUrl(media.posterPath, "w92") : null;
  return (
    <div className="relative h-14 w-10 shrink-0 overflow-hidden rounded-md bg-shelf-border">
      {src ? (
        <Image src={src} alt="" fill className="object-cover" sizes="40px" />
      ) : (
        <div className="flex h-full items-center justify-center text-shelf-muted">
          {media.type === "movie" ? <Film size={18} /> : <Tv size={18} />}
        </div>
      )}
    </div>
  );
}

function isPlexMovieItem(p: PlexOnDeckItem): boolean {
  if (p.tmdbType === "movie") return true;
  if (p.type === "movie") return true;
  return false;
}

export function PlexIntegrationPanel() {
  const { list, loading: listLoading, optimisticUpdate, optimisticAdd, refetch } = useMediaList();
  const [status, setStatus] = useState<StatusState>({ loading: true });
  const [appHealth, setAppHealth] = useState<AppHealth>(null);
  const [items, setItems] = useState<PlexOnDeckItem[]>([]);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [loadingDeck, setLoadingDeck] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [plexScan, setPlexScan] = useState<{ onDeck: number; library: number } | null>(null);
  const [addingKey, setAddingKey] = useState<string | null>(null);
  const [bulkSyncingTv, setBulkSyncingTv] = useState(false);
  const [plexTab, setPlexTab] = useState<PlexPanelTab>("both");
  const [plexOnlyKind, setPlexOnlyKind] = useState<PlexOnlyKind>("tv");
  const [matchingItem, setMatchingItem] = useState<PlexOnDeckItem | null>(null);
  /** Rows hidden after add; Plex often has no TMDB so `plexOnly` cannot infer removal from list alone. Cleared on Refresh. */
  const [dismissedPlexOnlyRowKeys, setDismissedPlexOnlyRowKeys] = useState<string[]>([]);

  const loadStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/plex/status");
      const data = await res.json();
      if (!data.configured) {
        setStatus({ loading: false, configured: false, message: data.message });
        return;
      }
      setStatus({
        loading: false,
        configured: true,
        reachable: Boolean(data.reachable),
        message: data.message,
      });
    } catch {
      setStatus({ loading: false, configured: false, message: "Could not reach status endpoint." });
    }
  }, []);

  const loadHealth = useCallback(async () => {
    try {
      const res = await fetch("/api/health");
      const data = await res.json();
      setAppHealth({
        ok: Boolean(data.ok),
        db: Boolean(data.db),
        plex: typeof data.plex === "boolean" ? data.plex : undefined,
      });
    } catch {
      setAppHealth({ ok: false, db: false });
    }
  }, []);

  const loadOnDeck = useCallback(async () => {
    setLoadingDeck(true);
    setDeckError(null);
    try {
      const res = await fetch("/api/plex/on-deck");
      const data = await res.json();
      if (!res.ok) {
        setDeckError(data.error || "Failed to load On Deck");
        setItems([]);
        return;
      }
      setItems(Array.isArray(data.items) ? data.items : []);
      setPlexScan({
        onDeck: typeof data.onDeckCount === "number" ? data.onDeckCount : 0,
        library: typeof data.libraryPartialCount === "number" ? data.libraryPartialCount : 0,
      });
      if (data.error) setDeckError(data.error);
    } catch {
      setDeckError("Network error — is the app reachable?");
      setItems([]);
      setPlexScan(null);
    } finally {
      setLoadingDeck(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
    loadHealth();
  }, [loadStatus, loadHealth]);

  useEffect(() => {
    if (status.loading) return;
    if (!status.configured || !status.reachable) {
      setLoadingDeck(false);
      setItems([]);
      setPlexScan(null);
      setDeckError(null);
      return;
    }
    loadOnDeck();
  }, [status, loadOnDeck]);

  const { matches, watchBoxInProgressOnly, plexOnly: plexOnlyRaw } = useMemo(
    () => computeWatchingMatches(list, items),
    [list, items]
  );

  const dismissedPlexOnlySet = useMemo(() => new Set(dismissedPlexOnlyRowKeys), [dismissedPlexOnlyRowKeys]);

  const plexOnly = useMemo(
    () => plexOnlyRaw.filter((p) => !dismissedPlexOnlySet.has(plexOnDeckRowKey(p))),
    [plexOnlyRaw, dismissedPlexOnlySet]
  );

  const dismissPlexOnlyRow = useCallback((item: PlexOnDeckItem) => {
    const k = plexOnDeckRowKey(item);
    setDismissedPlexOnlyRowKeys((prev) => (prev.includes(k) ? prev : [...prev, k]));
  }, []);

  const { plexOnlyTv, plexOnlyMovies } = useMemo(() => {
    const tv: PlexOnDeckItem[] = [];
    const movies: PlexOnDeckItem[] = [];
    for (const p of plexOnly) {
      if (isPlexMovieItem(p)) movies.push(p);
      else tv.push(p);
    }
    return { plexOnlyTv: tv, plexOnlyMovies: movies };
  }, [plexOnly]);

  useEffect(() => {
    if (plexTab !== "plexonly") return;
    if (plexOnlyTv.length === 0 && plexOnlyMovies.length > 0) {
      setPlexOnlyKind("movies");
    } else if (plexOnlyMovies.length === 0 && plexOnlyTv.length > 0) {
      setPlexOnlyKind("tv");
    }
  }, [plexTab, plexOnlyTv.length, plexOnlyMovies.length]);

  const refreshAll = () => {
    setDismissedPlexOnlyRowKeys([]);
    loadStatus();
    loadHealth();
    loadOnDeck();
  };

  const addPlexOnlyToWatchBox = async (item: PlexOnDeckItem) => {
    const key = plexOnDeckRowKey(item);
    if (item.tmdbId == null || item.tmdbId < 1 || !item.tmdbType) {
      setMatchingItem(item);
      return;
    }
    setAddingKey(key);
    try {
      const title =
        item.tmdbType === "tv" ? (item.grandparentTitle ?? item.title) : item.title;
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId: item.tmdbId,
          type: item.tmdbType,
          title,
          status: "in_progress",
          streamingService: "Plex",
          viewer: "both",
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.error("Already in your list");
        dismissPlexOnlyRow(item);
        await refetch();
        return;
      }
      if (!res.ok) {
        toast.error(typeof data.error === "string" ? data.error : "Could not add");
        return;
      }
      const media = data as Media;
      optimisticAdd(media);
      const note = progressNoteFromPlex(item);
      if (note) {
        const patchRes = await fetch(`/api/media/${media.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progressNote: note }),
        });
        if (patchRes.ok) {
          optimisticUpdate(media.id, { progressNote: note });
        }
      }
      toast.success("Added to WatchBox");
      dismissPlexOnlyRow(item);
      await refetch();
    } catch {
      toast.error("Request failed");
    } finally {
      setAddingKey(null);
    }
  };

  const syncFromPlex = async (m: WatchingMatch) => {
    const note = progressNoteFromPlex(m.plex);
    if (!note) {
      toast.error("No episode progress to sync from Plex for this item.");
      return;
    }
    setSyncingId(m.media.id);
    try {
      const res = await fetch(`/api/media/${m.media.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ progressNote: note }),
      });
      if (!res.ok) {
        toast.error("Could not update WatchBox");
        return;
      }
      optimisticUpdate(m.media.id, { progressNote: note });
      toast.success("WatchBox progress updated from Plex");
    } catch {
      toast.error("Update failed");
    } finally {
      setSyncingId(null);
    }
  };

  const handleTmdbMatch = async (tmdbId: number, mediaType: "movie" | "tv") => {
    if (!matchingItem) return;
    if (!tmdbId || typeof tmdbId !== "number") {
      toast.error("Invalid TMDB ID");
      return;
    }
    const key = plexOnDeckRowKey(matchingItem);
    setAddingKey(key);
    try {
      const title =
        mediaType === "tv" ? (matchingItem.grandparentTitle ?? matchingItem.title) : matchingItem.title;
      const res = await fetch("/api/media", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tmdbId,
          type: mediaType,
          title,
          status: "in_progress",
          streamingService: "Plex",
          viewer: "both",
        }),
      });
      const data = await res.json();
      if (res.status === 409) {
        toast.error("Already in your list");
        dismissPlexOnlyRow(matchingItem);
        await refetch();
        setMatchingItem(null);
        return;
      }
      if (!res.ok) {
        const errorMsg = typeof data.error === "string" ? data.error : "Could not add";
        toast.error(errorMsg);
        return;
      }
      const media = data as Media;
      optimisticAdd(media);
      const note = progressNoteFromPlex(matchingItem);
      if (note) {
        const patchRes = await fetch(`/api/media/${media.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ progressNote: note }),
        });
        if (patchRes.ok) {
          optimisticUpdate(media.id, { progressNote: note });
        }
      }
      toast.success("Added to WatchBox");
      dismissPlexOnlyRow(matchingItem);
      await refetch();
      setMatchingItem(null);
    } catch {
      toast.error("Request failed");
    } finally {
      setAddingKey(null);
    }
  };

  const syncAllTvFromPlex = async () => {
    const tvMatches = matches.filter(
      (m) => m.media.type === "tv" && Boolean(progressNoteFromPlex(m.plex))
    );
    if (tvMatches.length === 0) {
      toast.info("No TV overlap with Plex progress notes to sync.");
      return;
    }
    setBulkSyncingTv(true);
    let ok = 0;
    try {
      for (const { media, plex } of tvMatches) {
        const note = progressNoteFromPlex(plex);
        if (!note) continue;
        try {
          const res = await fetch(`/api/media/${media.id}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ progressNote: note }),
          });
          if (res.ok) {
            optimisticUpdate(media.id, { progressNote: note });
            ok++;
          }
        } catch {
        }
      }
      if (ok > 0) {
        toast.success(`Synced ${ok} TV show${ok === 1 ? "" : "s"} from Plex`);
      } else {
        toast.error("Could not sync any titles");
      }
      await refetch();
    } finally {
      setBulkSyncingTv(false);
    }
  };

  const plexConfigured = !status.loading && status.configured && status.reachable;

  return (
    <div className="pb-6 md:pb-8">
      <header className="border-b border-shelf-border bg-shelf-bg/95 backdrop-blur">
        <div className="flex items-center gap-2.5 px-3 py-2 sm:gap-3 sm:px-4 md:px-6 md:py-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-shelf-border bg-gradient-to-br from-cyan-500/20 to-[#8b5cf6]/20 sm:h-9 sm:w-9 sm:rounded-xl">
            <PlexMarkIcon className="text-cyan-400" size={20} />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-sm font-semibold leading-tight text-white sm:text-base md:text-lg">
              Plex & library sync
            </h2>
          </div>
          <div className="relative group">
            <button
              type="button"
              className="text-shelf-muted hover:text-white transition shrink-0 p-1.5"
              title="About Plex integration"
            >
              <Info size={16} />
            </button>
            <div className="pointer-events-none absolute right-0 bottom-full mb-2 hidden group-hover:flex z-10">
              <div className="rounded-lg border border-shelf-border bg-shelf-bg/95 backdrop-blur px-3 py-2 text-[10px] text-shelf-muted leading-snug w-64 md:w-72">
                Sync your Plex watching progress with WatchBox. Shows matching titles from both services and allows you to add Plex items to your WatchBox.
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-shelf-border bg-shelf-card px-2.5 py-2 text-xs font-medium text-white hover:bg-shelf-card/80 active:scale-[0.99] sm:gap-2 sm:px-3 sm:text-sm"
            aria-label="Refresh all"
            title="Refresh Plex data"
          >
            <RefreshCw size={15} className="shrink-0 sm:h-4 sm:w-4" />
            <span>Refresh</span>
          </button>
        </div>
      </header>

      <div className="space-y-3 px-3 pt-3 pb-4 sm:space-y-4 sm:px-4 sm:pt-3 md:space-y-6 md:p-6">
        <div className="grid grid-cols-2 gap-1.5 md:flex md:flex-wrap md:gap-1.5">
          <div
            className={`inline-flex items-center justify-center gap-1.5 rounded-full border px-2.5 py-1.5 text-[10px] font-medium md:text-xs ${
              appHealth?.ok && appHealth.db
                ? "border-green-500/40 bg-green-500/10 text-green-300"
                : "border-amber-500/40 bg-amber-500/10 text-amber-200"
            }`}
          >
            {appHealth?.ok && appHealth.db ? (
              <CheckCircle2 size={12} />
            ) : (
              <AlertCircle size={12} />
            )}
            <span className="hidden sm:inline">WatchBox {appHealth?.ok && appHealth.db ? "OK" : "error"}</span>
            <span className="sm:hidden">WB</span>
          </div>
          {status.loading ? (
            <div className="inline-flex items-center justify-center gap-1 rounded-full border border-shelf-border bg-shelf-card/50 px-2.5 py-1.5 text-[10px] text-shelf-muted md:text-xs">
              <Loader2 size={11} className="animate-spin shrink-0" />
              <span className="hidden sm:inline">Plex…</span>
            </div>
          ) : !status.configured ? (
            <div className="inline-flex items-center justify-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/5 px-2.5 py-1.5 text-[10px] text-amber-200 md:text-xs">
              <CloudOff size={11} />
              <span className="hidden sm:inline">Not configured</span>
            </div>
          ) : status.reachable ? (
            <div className="inline-flex items-center justify-center gap-1 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-2.5 py-1.5 text-[10px] font-medium text-cyan-200 md:text-xs">
              <MonitorPlay size={11} className="shrink-0" />
              <span className="hidden sm:inline">Plex OK</span>
            </div>
          ) : (
            <div className="inline-flex items-center justify-center gap-1 rounded-full border border-red-500/40 bg-red-500/10 px-2.5 py-1.5 text-[10px] text-red-200 md:text-xs">
              <AlertCircle size={11} />
              <span className="hidden sm:inline">Unreachable</span>
            </div>
          )}
        </div>

        {!status.loading && !status.configured && (
          <p className="rounded-xl border border-shelf-border bg-shelf-card/30 p-3 text-[13px] leading-snug text-shelf-muted sm:p-4 sm:text-sm">
            Add <code className="rounded bg-shelf-bg px-1 text-[11px] sm:text-xs">PLEX_SERVER_URL</code> and{" "}
            <code className="rounded bg-shelf-bg px-1 text-[11px] sm:text-xs">PLEX_TOKEN</code> to your environment to
            connect Plex. Overlap and Plex sections stay empty until then.
          </p>
        )}

        <div
          className="flex flex-col gap-2 md:gap-3"
          role="tablist"
          aria-label="Plex sections"
        >
          {(
            [
              {
                id: "both" as const,
                label: "Both",
                count: matches.length,
                icon: Sparkles,
              },
              {
                id: "watchbox" as const,
                label: "WB only",
                count: watchBoxInProgressOnly.length,
                icon: Library,
              },
              {
                id: "plexonly" as const,
                label: "Plex only",
                count: plexOnly.length,
                icon: MonitorPlay,
              },
            ] as const
          ).map(({ id, label, count, icon: TabIcon }) => {
            const active = plexTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setPlexTab(id)}
                className={`flex items-center justify-between gap-2 rounded-xl border py-3 px-4 text-sm font-medium transition ${
                  active
                    ? "border-[#8b5cf6]/50 bg-[#8b5cf6] text-white shadow-md shadow-[#8b5cf6]/20"
                    : "border-shelf-border bg-shelf-card/30 text-shelf-muted hover:bg-shelf-card hover:text-white"
                }`}
              >
                <span className="flex items-center gap-2">
                  <TabIcon size={18} className="shrink-0" aria-hidden />
                  <span className="font-semibold">{label}</span>
                </span>
                <span className={`tabular-nums font-semibold ${active ? "text-white/90" : "text-shelf-muted"}`}>
                  {count}
                </span>
              </button>
            );
          })}
        </div>

        {plexTab === "plexonly" && plexOnly.length > 0 && (
          <div className="flex gap-2">
            <button
              type="button"
              role="tab"
              aria-selected={plexOnlyKind === "tv"}
              onClick={() => setPlexOnlyKind("tv")}
              title="TV series"
              className={`flex-1 flex items-center justify-between gap-2 rounded-xl border py-3 px-4 text-sm font-medium transition ${
                plexOnlyKind === "tv"
                  ? "border-[#8b5cf6]/50 bg-[#8b5cf6] text-white shadow-md shadow-[#8b5cf6]/20"
                  : "border-shelf-border bg-shelf-card/30 text-shelf-muted hover:bg-shelf-card hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <Tv size={18} className="shrink-0" aria-hidden />
                <span className="font-semibold">TV</span>
              </span>
              <span className={`tabular-nums font-semibold ${plexOnlyKind === "tv" ? "text-white/90" : "text-shelf-muted"}`}>
                {plexOnlyTv.length}
              </span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={plexOnlyKind === "movies"}
              onClick={() => setPlexOnlyKind("movies")}
              title="Movies"
              className={`flex-1 flex items-center justify-between gap-2 rounded-xl border py-3 px-4 text-sm font-medium transition ${
                plexOnlyKind === "movies"
                  ? "border-[#8b5cf6]/50 bg-[#8b5cf6] text-white shadow-md shadow-[#8b5cf6]/20"
                  : "border-shelf-border bg-shelf-card/30 text-shelf-muted hover:bg-shelf-card hover:text-white"
              }`}
            >
              <span className="flex items-center gap-2">
                <Film size={18} className="shrink-0" aria-hidden />
                <span className="font-semibold">Movies</span>
              </span>
              <span className={`tabular-nums font-semibold ${plexOnlyKind === "movies" ? "text-white/90" : "text-shelf-muted"}`}>
                {plexOnlyMovies.length}
              </span>
            </button>
          </div>
        )}

        {plexTab === "both" && (
        <section className="space-y-3">
          <h2 className="sr-only">In both WatchBox and Plex</h2>
          {plexScan && plexConfigured && !loadingDeck && (
            <p className="text-[10px] text-shelf-muted/80 md:text-xs">
              Plex: {plexScan.onDeck} on deck + {plexScan.library} library (started)
            </p>
          )}
          {matches.length > 0 && plexConfigured && !loadingDeck && (
            <button
              type="button"
              onClick={() => void syncAllTvFromPlex()}
              disabled={bulkSyncingTv || matches.every((m) => m.media.type !== "tv" || !progressNoteFromPlex(m.plex))}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-cyan-500/90 hover:bg-cyan-500 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-cyan-500/25 disabled:opacity-50 transition"
            >
              {bulkSyncingTv ? <Loader2 size={14} className="animate-spin" /> : <ArrowRight size={14} />}
              Sync TV
            </button>
          )}
          {plexConfigured && loadingDeck && (
            <div className="flex items-center justify-center gap-2 py-6 text-sm text-shelf-muted">
              <Loader2 size={18} className="animate-spin shrink-0" />
              Loading Plex…
            </div>
          )}
          {matches.length === 0 && !loadingDeck && plexConfigured && (
            <p className="rounded-lg border border-dashed border-shelf-border px-2.5 py-3 text-center text-[11px] text-shelf-muted md:text-sm">
              No overlap yet — mark something in progress in WatchBox and watch on Plex.
            </p>
          )}
          <ul className="space-y-2 md:space-y-3">
            {matches.map(({ media, plex }) => (
              <li
                key={media.id}
                className="rounded-lg border border-shelf-border bg-shelf-card/50 p-2.5 md:p-4"
              >
                <div className="flex gap-2 md:gap-4">
                  <MediaThumb media={media} />
                  <div className="min-w-0 flex-1 space-y-1.5 md:space-y-3">
                    <div>
                      <Link
                        href={media.type === "movie" ? "/movies" : "/series"}
                        className="text-sm font-semibold text-white hover:text-shelf-accent transition line-clamp-1 md:line-clamp-2"
                      >
                        {media.title}
                      </Link>
                      <p className="text-[10px] text-shelf-muted/90">
                        {media.progressNote ? `${media.progressNote}` : "—"}
                      </p>
                    </div>
                    <div className="hidden md:grid md:grid-cols-2 gap-2 md:gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-shelf-muted mb-1">WatchBox</p>
                        <p className="text-xs text-cyan-200/90 mb-1">In progress</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-shelf-muted mb-1 flex items-center gap-1">
                          <MonitorPlay size={12} /> Plex
                        </p>
                        <PlexPlayback item={plex} />
                        <p className="text-xs text-shelf-muted mt-1 truncate">
                          {plex.type === "episode"
                            ? `${plex.grandparentTitle ?? ""} · S${plex.parentIndex ?? "—"} E${plex.index ?? "—"}`
                            : plex.type === "show"
                              ? "TV series"
                              : "Movie"}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-1 pt-1 md:pt-0">
                      <button
                        type="button"
                        onClick={() => syncFromPlex({ media, plex })}
                        disabled={syncingId === media.id || !progressNoteFromPlex(plex)}
                        className="inline-flex min-h-[32px] flex-1 items-center justify-center gap-1 rounded-lg bg-shelf-accent px-2 py-1 text-xs font-medium text-white hover:bg-shelf-accent-hover disabled:opacity-40 md:min-h-0 md:flex-initial md:gap-1.5 md:px-3 md:py-2"
                      >
                        {syncingId === media.id ? (
                          <Loader2 size={13} className="animate-spin" />
                        ) : (
                          <ArrowRight size={13} />
                        )}
                        <span className="hidden sm:inline">Sync</span>
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>
        )}

        {plexTab === "watchbox" && (
        <section className="space-y-3">
          <h2 className="sr-only">In WatchBox only</h2>
          {listLoading && (
            <Loader2 className="animate-spin text-shelf-muted" size={20} />
          )}
          {!listLoading && watchBoxInProgressOnly.length === 0 && (
            <p className="text-shelf-muted text-sm">Nothing here &mdash; you&rsquo;re all synced or nothing is in progress.</p>
          )}
          <ul className="space-y-2">
            {watchBoxInProgressOnly.map((media) => (
              <li
                key={media.id}
                className="flex items-center gap-3 rounded-xl border border-shelf-border bg-shelf-card/40 px-3 py-2"
              >
                <MediaThumb media={media} />
                <div className="min-w-0 flex-1">
                  <p className="font-medium text-white truncate">{media.title}</p>
                  <p className="text-xs text-shelf-muted truncate">{media.progressNote || "No progress note"}</p>
                </div>
                <Link
                  href={media.type === "movie" ? "/movies" : "/series"}
                  className="text-xs text-shelf-accent shrink-0"
                >
                  Open
                </Link>
              </li>
            ))}
          </ul>
        </section>
        )}

        {plexTab === "plexonly" && (
        <section className="space-y-2 md:space-y-3">
          <h2 className="sr-only">On Plex only</h2>
          {deckError && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 mb-4">
              {deckError}
            </div>
          )}
          {plexConfigured && !loadingDeck && plexOnly.length === 0 && !deckError && (
            <p className="text-shelf-muted text-sm">
              Nothing here &mdash; everything Plex reported is already in WatchBox, or there&rsquo;s nothing in progress on Plex.
            </p>
          )}

          {plexOnlyKind === "tv" && (
            <div>
              {plexOnlyTv.length === 0 ? (
                <p className="text-sm text-shelf-muted">No TV items in this list.</p>
              ) : (
                <ul className="space-y-2 md:space-y-3">
                  {plexOnlyTv.map((item) => {
                    const rowKey = plexOnDeckRowKey(item);
                    const isEpisode = item.type === "episode";
                    const seriesName = item.grandparentTitle || item.title;
                    const episodeInfo = isEpisode
                      ? `${item.grandparentTitle || "Show"} · S${item.parentIndex ?? "—"} E${item.index ?? "—"}`
                      : "TV";
                    const canAdd =
                      item.tmdbId != null && item.tmdbId > 0 && item.tmdbType === "tv";
                    return (
                      <li
                        key={rowKey}
                        className="rounded-lg border border-shelf-border bg-shelf-card/50 p-2.5 flex gap-2 md:gap-3 md:p-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-shelf-bg text-shelf-muted md:h-10 md:w-10">
                          <Tv size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white truncate text-sm">{seriesName}</p>
                          <p className="text-[10px] text-shelf-muted truncate">
                            {episodeInfo}
                            {item.source === "library" && (
                              <span className="text-amber-200/80"> · lib</span>
                            )}
                          </p>
                          <div className="mt-1 hidden md:block">
                            <PlexPlayback item={item} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => void addPlexOnlyToWatchBox(item)}
                            disabled={!canAdd || addingKey === rowKey}
                            className="inline-flex items-center justify-center gap-0.5 rounded-lg border border-shelf-border bg-shelf-card px-2 py-1.5 text-xs font-medium text-white hover:bg-shelf-card/80 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap md:gap-1.5 md:px-3 md:py-2"
                            title={canAdd ? "Add to WatchBox" : "No TMDB match"}
                          >
                            {addingKey === rowKey ? (
                              <Loader2 size={13} className="animate-spin md:h-4 md:w-4" />
                            ) : (
                              <Plus size={13} className="md:h-4 md:w-4" />
                            )}
                            <span className="hidden sm:inline">Add</span>
                          </button>
                          {!canAdd && (
                            <button
                              type="button"
                              onClick={() => setMatchingItem(item)}
                              className="inline-flex items-center justify-center text-[10px] text-shelf-accent hover:underline whitespace-nowrap md:text-xs"
                            >
                              Find
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}

          {plexOnlyKind === "movies" && (
            <div>
              {plexOnlyMovies.length === 0 ? (
                <p className="text-sm text-shelf-muted">No movies in this list.</p>
              ) : (
                <ul className="space-y-2 md:space-y-3">
                  {plexOnlyMovies.map((item) => {
                    const rowKey = plexOnDeckRowKey(item);
                    const canAdd =
                      item.tmdbId != null && item.tmdbId > 0 && item.tmdbType === "movie";
                    return (
                      <li
                        key={rowKey}
                        className="rounded-lg border border-shelf-border bg-shelf-card/50 p-2.5 flex gap-2 md:gap-3 md:p-3"
                      >
                        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-shelf-bg text-shelf-muted md:h-10 md:w-10">
                          <Film size={18} />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="font-medium text-white truncate text-sm">{item.title}</p>
                          <p className="text-[10px] text-shelf-muted truncate">
                            Movie
                            {item.source === "library" && (
                              <span className="text-amber-200/80"> · lib</span>
                            )}
                          </p>
                          <div className="mt-1 hidden md:block">
                            <PlexPlayback item={item} />
                          </div>
                        </div>
                        <div className="flex flex-col gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => void addPlexOnlyToWatchBox(item)}
                            disabled={!canAdd || addingKey === rowKey}
                            className="inline-flex items-center justify-center gap-0.5 rounded-lg border border-shelf-border bg-shelf-card px-2 py-1.5 text-xs font-medium text-white hover:bg-shelf-card/80 disabled:opacity-40 disabled:pointer-events-none whitespace-nowrap md:gap-1.5 md:px-3 md:py-2"
                            title={canAdd ? "Add to WatchBox" : "No TMDB match"}
                          >
                            {addingKey === rowKey ? (
                              <Loader2 size={13} className="animate-spin md:h-4 md:w-4" />
                            ) : (
                              <Plus size={13} className="md:h-4 md:w-4" />
                            )}
                            <span className="hidden sm:inline">Add</span>
                          </button>
                          {!canAdd && (
                            <button
                              type="button"
                              onClick={() => setMatchingItem(item)}
                              className="inline-flex items-center justify-center text-[10px] text-shelf-accent hover:underline whitespace-nowrap md:text-xs"
                            >
                              Find
                            </button>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          )}
        </section>
        )}
      </div>
      {matchingItem && (
        <PlexTmdbMatchModal
          item={matchingItem}
          onMatch={handleTmdbMatch}
          onClose={() => setMatchingItem(null)}
        />
      )}
    </div>
  );
}
