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
  HeartHandshake,
  Library,
  CloudOff,
  ArrowRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { useMediaList } from "@/contexts/MediaListContext";
import type { PlexOnDeckItem } from "@/lib/plex";
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

export function PlexIntegrationPanel() {
  const { list, loading: listLoading, optimisticUpdate } = useMediaList();
  const [status, setStatus] = useState<StatusState>({ loading: true });
  const [appHealth, setAppHealth] = useState<AppHealth>(null);
  const [items, setItems] = useState<PlexOnDeckItem[]>([]);
  const [deckError, setDeckError] = useState<string | null>(null);
  const [loadingDeck, setLoadingDeck] = useState(true);
  const [syncingId, setSyncingId] = useState<string | null>(null);
  const [plexScan, setPlexScan] = useState<{ onDeck: number; library: number } | null>(null);

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

  const { matches, watchBoxInProgressOnly, plexOnly } = useMemo(
    () => computeWatchingMatches(list, items),
    [list, items]
  );

  const refreshAll = () => {
    loadStatus();
    loadHealth();
    loadOnDeck();
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

  const plexConfigured = !status.loading && status.configured && status.reachable;

  return (
    <div className="pb-8">
      <header className="sticky top-14 md:top-0 z-20 border-b border-shelf-border bg-shelf-bg/95 backdrop-blur">
        <div className="px-4 md:px-6 py-3 md:py-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-[#8b5cf6]/20 border border-shelf-border">
              <HeartHandshake className="text-cyan-400" size={22} />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg md:text-xl font-semibold text-white truncate">Plex & library sync</h2>
              <p className="text-xs text-shelf-muted truncate">
                Connect Plex, compare On Deck with WatchBox, and sync progress notes
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={refreshAll}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-shelf-border bg-shelf-card px-4 py-2.5 text-sm text-white hover:bg-shelf-card/80 shrink-0"
          >
            <RefreshCw size={16} />
            Refresh all
          </button>
        </div>
      </header>

      <div className="p-4 md:p-6 max-w-4xl space-y-10">
        {/* Status strip */}
        <div className="flex flex-wrap gap-2">
          <div
            className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-medium ${
              appHealth?.ok && appHealth.db
                ? "border-green-500/40 bg-green-500/10 text-green-300"
                : "border-amber-500/40 bg-amber-500/10 text-amber-200"
            }`}
          >
            {appHealth?.ok && appHealth.db ? (
              <CheckCircle2 size={14} />
            ) : (
              <AlertCircle size={14} />
            )}
            WatchBox {appHealth?.ok && appHealth.db ? "· DB OK" : "· check /api/health"}
            {typeof appHealth?.plex === "boolean" && (
              <span className="opacity-80">
                {" "}
                · Plex {appHealth.plex ? "OK" : "down"}
              </span>
            )}
          </div>
          {status.loading ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-shelf-border bg-shelf-card/50 px-3 py-1.5 text-xs text-shelf-muted">
              <Loader2 size={14} className="animate-spin" />
              Plex…
            </div>
          ) : !status.configured ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-amber-500/30 bg-amber-500/5 px-3 py-1.5 text-xs text-amber-200">
              <CloudOff size={14} />
              Plex not configured
            </div>
          ) : status.reachable ? (
            <div className="inline-flex items-center gap-2 rounded-full border border-cyan-500/40 bg-cyan-500/10 px-3 py-1.5 text-xs font-medium text-cyan-200">
              <MonitorPlay size={14} />
              Plex server reachable
            </div>
          ) : (
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/40 bg-red-500/10 px-3 py-1.5 text-xs text-red-200">
              <AlertCircle size={14} />
              Plex unreachable — check URL, token, firewall
            </div>
          )}
        </div>

        {!status.loading && !status.configured && (
          <p className="text-sm text-shelf-muted rounded-xl border border-shelf-border bg-shelf-card/30 p-4">
            Add <code className="text-xs bg-shelf-bg px-1 rounded">PLEX_SERVER_URL</code> and{" "}
            <code className="text-xs bg-shelf-bg px-1 rounded">PLEX_TOKEN</code> to your environment to connect Plex.
            Overlap and Plex sections stay empty until then.
          </p>
        )}

        {/* Overlap */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Sparkles className="text-shelf-accent shrink-0" size={20} />
            <h2 className="text-lg font-semibold text-white">In both WatchBox & Plex</h2>
          </div>
          <p className="text-sm text-shelf-muted mb-2">
            Same title (TMDB id) in your list and on Plex — including shows you started that are{" "}
            <strong className="text-white/90">no longer on Plex’s short “Continue watching” row</strong> but still
            partially watched in your libraries.
          </p>
          {plexScan && plexConfigured && !loadingDeck && (
            <p className="text-xs text-shelf-muted/90 mb-4">
              Plex data: {plexScan.onDeck} on deck + {plexScan.library} from library scan (started, not finished).
            </p>
          )}
          <p className="text-sm text-shelf-muted mb-4">
            Use <span className="text-white/90">Sync from Plex</span> to copy episode or episode-count info into
            WatchBox’s progress note.
          </p>
          {plexConfigured && loadingDeck && (
            <div className="flex items-center gap-2 text-shelf-muted py-6">
              <Loader2 size={18} className="animate-spin" />
              Loading Plex…
            </div>
          )}
          {matches.length === 0 && !loadingDeck && plexConfigured && (
            <p className="text-shelf-muted text-sm py-2 border border-dashed border-shelf-border rounded-xl px-4 py-6 text-center">
              No overlap yet — mark something <strong className="text-white/90">In progress</strong> in WatchBox and
              watch it on Plex (with TMDB metadata) to see it here.
            </p>
          )}
          <ul className="space-y-4">
            {matches.map(({ media, plex }) => (
              <li
                key={media.id}
                className="rounded-2xl border border-shelf-border bg-gradient-to-br from-shelf-card to-shelf-card/40 p-4 md:p-5"
              >
                <div className="flex gap-4">
                  <MediaThumb media={media} />
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <Link
                        href={media.type === "movie" ? "/movies" : "/series"}
                        className="font-semibold text-white hover:text-shelf-accent transition line-clamp-2"
                      >
                        {media.title}
                      </Link>
                      <p className="text-xs text-shelf-muted mt-0.5">
                        WatchBox: <span className="text-shelf-muted/90">{media.progressNote || "—"}</span>
                      </p>
                    </div>
                    <div className="grid sm:grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-shelf-muted mb-1">WatchBox</p>
                        <p className="text-xs text-cyan-200/90 mb-1">In progress</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wide text-shelf-muted mb-1 flex items-center gap-1">
                          <MonitorPlay size={12} /> Plex playback
                        </p>
                        <PlexPlayback item={plex} />
                        <p className="text-xs text-shelf-muted mt-1 truncate">
                          {plex.type === "episode"
                            ? `${plex.grandparentTitle ?? ""} · S${(plex.parentIndex ?? 0) + 1} E${plex.index ?? "—"}`
                            : plex.type === "show"
                              ? "TV series"
                              : "Movie"}
                          {plex.source === "library" && (
                            <span className="text-amber-200/80"> · library</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 pt-1">
                      <button
                        type="button"
                        onClick={() => syncFromPlex({ media, plex })}
                        disabled={syncingId === media.id || !progressNoteFromPlex(plex)}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-shelf-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-shelf-accent-hover disabled:opacity-40"
                      >
                        {syncingId === media.id ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <ArrowRight size={14} />
                        )}
                        Sync progress from Plex
                      </button>
                    </div>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* WatchBox in progress only */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <Library className="text-[#8b5cf6] shrink-0" size={20} />
            <h2 className="text-lg font-semibold text-white">In WatchBox only</h2>
          </div>
          <p className="text-sm text-shelf-muted mb-4">
            Marked <strong className="text-white/90">In progress</strong> here but Plex didn’t return a matching title
            (On Deck + library scan), or TMDB couldn’t be matched.
          </p>
          {listLoading && (
            <Loader2 className="animate-spin text-shelf-muted" size={20} />
          )}
          {!listLoading && watchBoxInProgressOnly.length === 0 && (
            <p className="text-shelf-muted text-sm">Nothing here — you’re all synced or nothing is in progress.</p>
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

        {/* Plex only */}
        <section>
          <div className="flex items-center gap-2 mb-4">
            <MonitorPlay className="text-cyan-400 shrink-0" size={20} />
            <h2 className="text-lg font-semibold text-white">On Plex only</h2>
          </div>
          <p className="text-sm text-shelf-muted mb-4">
            Continue watching on Plex for titles you haven’t added to WatchBox (or TMDB didn’t match).
          </p>
          {deckError && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-200 mb-4">
              {deckError}
            </div>
          )}
          {plexConfigured && !loadingDeck && plexOnly.length === 0 && !deckError && (
            <p className="text-shelf-muted text-sm">
              Nothing here — everything Plex reported is already in WatchBox, or there’s nothing in progress on Plex.
            </p>
          )}
          <ul className="space-y-3">
            {plexOnly.map((item) => {
              const sub =
                item.type === "episode"
                  ? `${item.grandparentTitle ?? "Show"} · S${(item.parentIndex ?? 0) + 1} E${item.index ?? "—"}`
                  : item.type === "show"
                    ? "TV series"
                    : "Movie";
              return (
                <li
                  key={`${item.ratingKey}-${item.source ?? "x"}`}
                  className="rounded-xl border border-shelf-border bg-shelf-card/30 p-4 flex gap-3"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-shelf-bg text-shelf-muted">
                    {item.type === "episode" || item.type === "show" ? <Tv size={20} /> : <Film size={20} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-medium text-white truncate">{item.title}</p>
                    <p className="text-sm text-shelf-muted truncate">
                      {sub}
                      {item.source === "library" && (
                        <span className="text-amber-200/80"> · library</span>
                      )}
                    </p>
                    <div className="mt-2">
                      <PlexPlayback item={item} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </div>
  );
}
