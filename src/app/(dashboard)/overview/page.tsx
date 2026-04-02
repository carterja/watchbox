"use client";

import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import {
  BarChart3,
  Calendar,
  CheckCircle2,
  Clapperboard,
  ExternalLink,
  Loader2,
  Radio,
  RefreshCw,
  Tv,
} from "lucide-react";
import { useMediaList } from "@/contexts/MediaListContext";
import { useWhatNextCache } from "@/contexts/WhatNextCacheContext";
import type { WhatNextRow } from "@/lib/whatNext";
import { posterUrl } from "@/lib/tmdb";

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

function QueueRow({ row }: { row: WhatNextRow }) {
  const href = `/series?open=${encodeURIComponent(row.mediaId)}`;
  const next = row.next;

  return (
    <li>
      <Link
        href={href}
        prefetch={true}
        className="flex gap-3 rounded-xl border border-shelf-border bg-shelf-card/40 p-3 transition hover:border-shelf-accent/40 hover:bg-shelf-card/60"
      >
        <div className="relative h-[72px] w-[48px] shrink-0 overflow-hidden rounded-lg border border-shelf-border bg-shelf-card">
          {row.posterPath ? (
            <Image
              src={posterUrl(row.posterPath)!}
              alt=""
              fill
              className="object-cover"
              sizes="48px"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center text-shelf-muted">
              <Tv size={22} />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium text-white truncate">{row.title}</p>
          {row.caughtUp ? (
            <p className="text-xs text-emerald-300/90 flex items-center gap-1 mt-0.5">
              <CheckCircle2 size={14} /> Caught up (or awaiting next season)
            </p>
          ) : next ? (
            <p className="text-sm text-cyan-200/90 mt-0.5">
              Next: S{next.season} E{next.episode}
              {next.name ? ` · ${next.name}` : ""}
            </p>
          ) : (
            <p className="text-xs text-shelf-muted mt-0.5">Set progress to see what&apos;s next</p>
          )}
          {next?.airDate && (
            <p className="text-[11px] text-shelf-muted mt-1 flex items-center gap-1">
              <Calendar size={12} className="shrink-0" />
              Air {next.airDate}
            </p>
          )}
        </div>
        <span className="self-center shrink-0 inline-flex items-center gap-1 rounded-lg border border-shelf-border px-2.5 py-1.5 text-xs text-shelf-accent">
          Manage
          <ExternalLink size={12} />
        </span>
      </Link>
    </li>
  );
}

export default function OverviewPage() {
  const { list } = useMediaList();
  const { rows, status: queueStatus, error: queueError, refresh: refreshQueue } = useWhatNextCache();

  const [stats, setStats] = useState<StatsPayload | null>(null);
  const [statsLoading, setStatsLoading] = useState(true);
  const [activity, setActivity] = useState<ActivityPayload | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);

  const load = useCallback(async () => {
    setStatsLoading(true);
    setActivityLoading(true);
    try {
      const [sRes, aRes] = await Promise.all([
        fetch("/api/stats"),
        fetch("/api/plex/activity"),
      ]);
      if (sRes.ok) setStats((await sRes.json()) as StatsPayload);
      if (aRes.ok) setActivity((await aRes.json()) as ActivityPayload);
    } finally {
      setStatsLoading(false);
      setActivityLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    void refreshQueue({ silent: true });
  }, [refreshQueue]);

  const queueRows = rows ?? [];
  const showQueueLoading = queueStatus === "loading" && rows === null;

  return (
    <div className="pb-24 md:pb-8 pt-4 md:pt-6 px-4 md:px-8 max-w-4xl mx-auto space-y-10">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold text-white flex items-center gap-2">
          <BarChart3 className="text-[#8b5cf6]" size={28} />
          Queue &amp; stats
        </h1>
        <p className="text-sm text-shelf-muted max-w-xl">
          Up next for in-progress series, library totals, and Plex webhook health. Conflict rules explain how
          manual progress merges with Plex.
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

      {/* Up next */}
      <section className="space-y-3">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-lg font-semibold text-white flex items-center gap-2">
            <Clapperboard size={18} className="text-shelf-muted" />
            Up next
          </h2>
          <button
            type="button"
            onClick={() => void refreshQueue()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-shelf-border px-2.5 py-1 text-xs text-shelf-muted hover:text-white hover:bg-shelf-card"
          >
            <RefreshCw size={14} />
            Refresh
          </button>
        </div>
        <p className="text-xs text-shelf-muted">
          Same queue as the Watching page — next episode from TMDB after your merged Plex + manual position.
        </p>
        {showQueueLoading ? (
          <div className="flex justify-center py-10">
            <Loader2 className="animate-spin text-cyan-400/80" size={28} />
          </div>
        ) : queueError && queueRows.length === 0 ? (
          <p className="text-sm text-amber-200/90">{queueError}</p>
        ) : queueRows.length === 0 ? (
          <p className="text-sm text-shelf-muted rounded-xl border border-dashed border-shelf-border p-6 text-center">
            Nothing in progress with a resolvable next episode. Mark a series{" "}
            <Link href="/watching" className="text-shelf-accent hover:underline">
              in progress on Watching
            </Link>
            .
          </p>
        ) : (
          <ul className="space-y-2">
            {queueRows.map((row) => (
              <QueueRow key={row.mediaId} row={row} />
            ))}
          </ul>
        )}
        <p className="text-[11px] text-shelf-muted">
          {list.filter((m) => m.type === "tv" && m.status === "in_progress").length} in-progress series in your
          library.
        </p>
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
            Open Plex settings <ExternalLink size={12} />
          </Link>
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
    </div>
  );
}
