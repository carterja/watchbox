"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  BarChart3,
  Clapperboard,
  ExternalLink,
  Film,
  Library,
  Loader2,
  Link2,
  PlusCircle,
  Radio,
  Tv,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useMediaList } from "@/contexts/MediaListContext";
import { PlexAccountFilterBanner } from "@/components/PlexAccountFilterBanner";
import { LinkUnmatchedToLibraryModal } from "@/components/LinkUnmatchedToLibraryModal";
import type { UnmatchedPlaybackItem } from "@/types/unmatchedPlayback";

type StatsPayload = {
  total: number;
  movies: number;
  tv: number;
  statusCounts: Record<string, number>;
  finishedThisYear: number;
  plexScrobblesLast30Days: number;
};

type ActivityPayload = {
  webhookSecretConfigured: boolean;
  plexConfigured: boolean;
  plexReachable: boolean;
  lastScrobbleAt: string | null;
  playbackEventsTotal: number;
  playbackEventsLast24h: number;
  playbackEventsLast7d: number;
  webhookAccountFilterActive: boolean;
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function StatCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string | number;
  sub?: string;
}) {
  return (
    <div className="rounded-xl border border-shelf-border bg-shelf-card/50 p-4">
      <p className="text-[11px] uppercase tracking-wide text-shelf-muted">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-xs text-shelf-muted">{sub}</p>}
    </div>
  );
}

export default function OverviewPage() {
  const { list } = useMediaList();

  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityPayload | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [unmatched, setUnmatched] = useState<UnmatchedPlaybackItem[] | null>(null);
  const [unmatchedLoading, setUnmatchedLoading] = useState(true);
  const [relinking, setRelinking] = useState(false);
  const [dismissingKey, setDismissingKey] = useState<string | null>(null);
  const [linkingItem, setLinkingItem] = useState<UnmatchedPlaybackItem | null>(null);

  const load = useCallback(async () => {
    setStatsLoading(true);
    setActivityLoading(true);
    setUnmatchedLoading(true);
    try {
      const [sRes, aRes, uRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/plex/activity"),
        fetch("/api/plex/unmatched-playback?days=14&limit=20"),
      ]);
      if (sRes.ok) setStats((await sRes.json()) as StatsPayload);
      if (aRes.ok) setActivity((await aRes.json()) as ActivityPayload);
      if (uRes.ok) {
        const u = (await uRes.json()) as { items: UnmatchedPlaybackItem[] };
        setUnmatched(Array.isArray(u.items) ? u.items : []);
      } else {
        setUnmatched([]);
      }
    } finally {
      setStatsLoading(false);
      setActivityLoading(false);
      setUnmatchedLoading(false);
    }
  }, []);

  const relinkPastPlayback = useCallback(async () => {
    setRelinking(true);
    try {
      const res = await fetch("/api/plex/relink-playback", { method: "POST" });
      const data = (await res.json()) as { playbackEventsUpdated?: number; error?: string };
      if (!res.ok) {
        toast.error(data.error || "Relink failed");
        return;
      }
      const n = data.playbackEventsUpdated ?? 0;
      toast.success(n > 0 ? `Linked ${n} past playback event${n === 1 ? "" : "s"} to your library` : "Nothing to relink");
      await load();
    } catch {
      toast.error("Relink failed");
    } finally {
      setRelinking(false);
    }
  }, [load]);

  const dismissUnmatched = useCallback(
    async (dedupeKey: string) => {
      setDismissingKey(dedupeKey);
      try {
        const res = await fetch("/api/plex/unmatched-playback/dismiss", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ dedupeKey }),
        });
        if (!res.ok) {
          toast.error("Could not dismiss");
          return;
        }
        setUnmatched((prev) => (prev ? prev.filter((i) => i.dedupeKey !== dedupeKey) : prev));
        toast.success("Hidden — won’t show here again");
      } catch {
        toast.error("Could not dismiss");
      } finally {
        setDismissingKey(null);
      }
    },
    []
  );

  useEffect(() => {
    void load();
  }, [load]);

  const inProgressTvCount = list.filter((m) => m.type === "tv" && m.status === "in_progress").length;

  return (
    <div className="pb-24 md:pb-8 pt-4 md:pt-6 px-4 md:px-8 max-w-4xl mx-auto space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="text-[#8b5cf6]" size={28} />
          Overview &amp; stats
        </h1>
        <p className="text-sm text-shelf-muted max-w-xl">
          Library totals, Plex health, and titles Plex couldn&apos;t match. Open{" "}
          <Link href="/watching" className="text-shelf-accent hover:underline">
            Watching
          </Link>{" "}
          for your up-next queue (carousel or list).
        </p>
      </header>

      {/* Stats */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <BarChart3 size={18} className="text-shelf-muted" />
          Library
        </h2>
        {statsLoading && !stats ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-shelf-muted" size={28} />
          </div>
        ) : stats ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <StatCard label="Total titles" value={stats.total} sub={`${stats.movies} movies · ${stats.tv} series`} />
            <StatCard
              label="In progress"
              value={stats.statusCounts.in_progress ?? 0}
            />
            <StatCard
              label="Finished (year)"
              value={stats.finishedThisYear}
              sub={`${new Date().getFullYear()} calendar`}
            />
            <StatCard
              label="Unwatched"
              value={stats.statusCounts.yet_to_start ?? 0}
            />
            <StatCard
              label="Rewatch"
              value={stats.statusCounts.rewatch ?? 0}
            />
            <StatCard
              label="Plex scrobbles (30d)"
              value={stats.plexScrobblesLast30Days}
              sub="Webhook history"
            />
          </div>
        ) : (
          <p className="text-sm text-amber-200/90">Could not load stats.</p>
        )}
      </section>

      {/* Watching shortcut */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Clapperboard size={18} className="text-shelf-muted" />
          Watching
        </h2>
        <div className="rounded-xl border border-shelf-border bg-shelf-card/40 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-sm text-white/90">
              {inProgressTvCount} in-progress series · next episodes from TMDB (merged with Plex + manual progress)
            </p>
            <p className="text-xs text-shelf-muted mt-1">Use the Watching page for the full queue and controls.</p>
          </div>
          <Link
            href="/watching"
            prefetch={true}
            className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#8b5cf6]/50 bg-[#8b5cf6]/15 px-4 py-2.5 text-sm font-medium text-[#c4b5fd] hover:bg-[#8b5cf6]/25"
          >
            Open Watching
            <ExternalLink size={14} />
          </Link>
        </div>
      </section>

      {/* Plex activity not linked to a WatchBox title */}
      <section id="outside-library" className="space-y-3 scroll-mt-24">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <PlusCircle size={18} className="text-shelf-muted" />
          Not in WatchBox
        </h2>
        <p className="text-xs text-shelf-muted max-w-xl">
          Recent Plex plays we couldn&apos;t attach to a library title (add the show or movie here, then it will
          sync on future scrobbles). Based on webhook history — Plex Pass required.
        </p>
        <div className="flex flex-wrap items-center gap-2 text-xs text-shelf-muted max-w-xl">
          <button
            type="button"
            onClick={() => void relinkPastPlayback()}
            disabled={relinking}
            className="inline-flex items-center gap-1.5 rounded-lg border border-shelf-border bg-shelf-card/50 px-2.5 py-1.5 text-shelf-muted hover:text-white hover:bg-shelf-card disabled:opacity-50"
          >
            {relinking ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
            Relink past events
          </button>
          <span className="text-[11px] leading-snug">
            If you already added a title (or used <strong className="text-white/80">Rematch</strong> on the detail
            card to fix the TMDB id), this attaches older webhook rows that had the right TMDB but no library link
            — e.g. &quot;Bluey (2018)&quot; vs <strong className="text-white/80">Bluey</strong>. Use{" "}
            <strong className="text-white/80">Link to library</strong> when the title is already in WatchBox but Plex
            metadata didn&apos;t match.
          </span>
        </div>
        {activity && !activity.webhookAccountFilterActive ? <PlexAccountFilterBanner className="max-w-xl" /> : null}
        {unmatchedLoading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="animate-spin text-shelf-muted" size={24} />
          </div>
        ) : !unmatched || unmatched.length === 0 ? (
          <p className="text-sm text-shelf-muted rounded-xl border border-dashed border-shelf-border p-6 text-center">
            Nothing unmatched in the last 14 days, or webhooks aren&apos;t recording yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {unmatched.map((item) => {
              const discoverHref = `/discover?q=${encodeURIComponent(item.discoverQuery)}&type=${item.discoverType}`;
              return (
                <li key={item.dedupeKey}>
                  <div className="flex flex-col gap-2 rounded-xl border border-shelf-border bg-shelf-card/40 p-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex gap-3 min-w-0">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-shelf-border bg-shelf-card text-shelf-muted">
                        {item.mediaKind === "movie" ? <Film size={20} /> : <Tv size={20} />}
                      </div>
                      <div className="min-w-0">
                        <p className="font-medium text-white truncate">{item.displayTitle}</p>
                        {item.subtitle && (
                          <p className="text-xs text-shelf-muted truncate">{item.subtitle}</p>
                        )}
                        <p className="text-[11px] text-shelf-muted/90 mt-0.5">
                          {formatWhen(item.lastActivityAt)} · {item.lastEvent.replace("media.", "")}
                          {item.accountTitle ? (
                            <span className="text-shelf-muted/70"> · Plex: {item.accountTitle}</span>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                      <button
                        type="button"
                        onClick={() => setLinkingItem(item)}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-2 text-xs text-emerald-100/95 hover:bg-emerald-500/20"
                      >
                        <Library size={14} />
                        Link to library
                      </button>
                      <button
                        type="button"
                        onClick={() => void dismissUnmatched(item.dedupeKey)}
                        disabled={dismissingKey === item.dedupeKey}
                        className="inline-flex items-center justify-center gap-1 rounded-lg border border-shelf-border bg-shelf-card/30 px-2.5 py-2 text-xs text-shelf-muted hover:text-white hover:bg-shelf-card disabled:opacity-50"
                        title="Hide this row — not shown again"
                      >
                        {dismissingKey === item.dedupeKey ? (
                          <Loader2 size={12} className="animate-spin" />
                        ) : (
                          <X size={14} />
                        )}
                        Dismiss
                      </button>
                      <Link
                        href={discoverHref}
                        prefetch={true}
                        className="inline-flex shrink-0 items-center justify-center gap-1.5 rounded-lg border border-[#8b5cf6]/50 bg-[#8b5cf6]/15 px-3 py-2 text-xs font-medium text-[#c4b5fd] hover:bg-[#8b5cf6]/25 sm:self-center"
                      >
                        Add in Discover
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Plex health + rules */}
      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <Radio size={18} className="text-shelf-muted" />
          Plex &amp; webhooks
        </h2>

        <div className="rounded-xl border border-shelf-border bg-shelf-card/40 p-4 space-y-3">
          <h3 className="text-sm font-medium text-white">Health</h3>
          {activityLoading && !activity ? (
            <Loader2 className="animate-spin text-shelf-muted" size={20} />
          ) : activity ? (
            <ul className="text-sm text-shelf-muted space-y-2">
              <li>
                <span className="text-white/90">Plex server:</span>{" "}
                {!activity.plexConfigured
                  ? "Not configured (set PLEX_SERVER_URL + PLEX_TOKEN)"
                  : activity.plexReachable
                    ? "Reachable"
                    : "Configured but not reachable"}
              </li>
              <li>
                <span className="text-white/90">Webhook URL secret:</span>{" "}
                {activity.webhookSecretConfigured
                  ? "Set — use ?secret= on your Plex webhook URL"
                  : "Optional — add PLEX_WEBHOOK_SECRET for URL verification"}
              </li>
              {activity.webhookAccountFilterActive ? (
                <li>
                  <span className="text-white/90">Account filter:</span> Only Plex accounts listed in{" "}
                  <code className="text-[11px] text-white/80">PLEX_WEBHOOK_ALLOWED_ACCOUNTS</code> are counted
                  (other home users are ignored).
                </li>
              ) : null}
              <li>
                <span className="text-white/90">Last scrobble recorded:</span> {formatWhen(activity.lastScrobbleAt)}
              </li>
              <li>
                <span className="text-white/90">Playback events:</span> {activity.playbackEventsTotal} total ·{" "}
                {activity.playbackEventsLast24h} last 24h · {activity.playbackEventsLast7d} last 7d
              </li>
            </ul>
          ) : (
            <p className="text-sm text-amber-200/90">Could not load Plex activity.</p>
          )}
          <Link
            href="/plex"
            className="inline-flex items-center gap-1 text-xs text-shelf-accent hover:underline"
          >
            Open Plex hub <ExternalLink size={12} />
          </Link>
          {activity && !activity.webhookAccountFilterActive ? <PlexAccountFilterBanner className="mt-3" /> : null}
        </div>

        <div className="rounded-xl border border-shelf-border bg-shelf-card/40 p-4 space-y-2">
          <h3 className="text-sm font-medium text-white">Conflict rules</h3>
          <ul className="text-sm text-shelf-muted list-disc pl-4 space-y-1.5">
            <li>
              <strong className="text-white/90 font-medium">Merging:</strong> WatchBox combines your manual “last
              watched” / season grid with Plex scrobbles by taking the <em>later</em> episode (compare season,
              then episode).
            </li>
            <li>
              <strong className="text-white/90 font-medium">What you’ll see:</strong> If Plex’s latest logged
              episode and your manual row differ, the detail panel shows a notice so you can fix or run “Sync” on
              the Plex page.
            </li>
            <li>
              <strong className="text-white/90 font-medium">Missed webhooks:</strong> Use “Apply watched” / sync on
              the Plex page — same merge rules as real-time webhooks.
            </li>
          </ul>
        </div>
      </section>

      {linkingItem ? (
        <LinkUnmatchedToLibraryModal
          item={linkingItem}
          onClose={() => setLinkingItem(null)}
          onLinked={() => void load()}
        />
      ) : null}
    </div>
  );
}
