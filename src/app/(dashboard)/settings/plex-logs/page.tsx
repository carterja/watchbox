"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CircleSlash,
  Loader2,
  Radio,
  RefreshCw,
} from "lucide-react";
import type { PlexPlaybackLogRow } from "@/types/plexPlaybackLog";

function formatEvent(ev: string): string {
  return ev.replace(/^media\./, "");
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

function detailLine(row: PlexPlaybackLogRow): string {
  if (row.showTitle) {
    const ep =
      row.season != null && row.episode != null
        ? `S${row.season} E${row.episode}`
        : "";
    const name = row.title?.trim();
    return [row.showTitle, ep, name].filter(Boolean).join(" · ");
  }
  return row.title?.trim() || "—";
}

export default function PlexLogsSettingsPage() {
  const [events, setEvents] = useState<PlexPlaybackLogRow[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [days, setDays] = useState(30);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/plex/playback-logs?days=${days}&limit=300`);
      const data = (await res.json()) as { events?: PlexPlaybackLogRow[]; error?: string };
      if (!res.ok) {
        setError(data.error || "Failed to load");
        setEvents([]);
        return;
      }
      setEvents(Array.isArray(data.events) ? data.events : []);
    } catch {
      setError("Failed to load");
      setEvents([]);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="min-h-screen pb-24 md:pb-8">
      <header className="sticky top-14 md:top-0 z-20 border-b border-shelf-border bg-shelf-bg/95 backdrop-blur">
        <div className="px-4 md:px-6 py-3 md:py-4 flex items-center gap-3">
          <Link
            href="/settings"
            className="inline-flex items-center gap-1 text-sm text-shelf-muted hover:text-white"
          >
            <ArrowLeft size={18} />
            Settings
          </Link>
        </div>
        <div className="px-4 md:px-6 pb-3 md:pb-4">
          <h1 className="text-xl md:text-2xl font-semibold text-white flex items-center gap-2">
            <Radio className="text-cyan-400" size={26} />
            Plex webhook log
          </h1>
          <p className="text-sm text-shelf-muted mt-1 max-w-2xl">
            All <code className="text-xs text-cyan-200/90">media.play</code>,{" "}
            <code className="text-xs text-cyan-200/90">pause</code>, <code className="text-xs text-cyan-200/90">stop</code>, and{" "}
            <code className="text-xs text-cyan-200/90">scrobble</code> events from your Plex server (Plex Pass webhooks).
            Scrobbles also update WatchBox when a title matches.
          </p>
        </div>
      </header>

      <div className="p-4 md:p-6 max-w-5xl space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <label className="flex items-center gap-2 text-sm text-shelf-muted">
            Last
            <select
              value={days}
              onChange={(e) => setDays(Number(e.target.value))}
              className="rounded-lg border border-shelf-border bg-shelf-card px-2 py-1.5 text-sm text-white"
            >
              <option value={7}>7 days</option>
              <option value={14}>14 days</option>
              <option value={30}>30 days</option>
              <option value={90}>90 days</option>
            </select>
          </label>
          <button
            type="button"
            onClick={() => void load()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-lg border border-shelf-border px-3 py-1.5 text-sm text-shelf-muted hover:text-white hover:bg-shelf-card disabled:opacity-50"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
            Refresh
          </button>
          <Link href="/plex" className="text-sm text-shelf-accent hover:underline">
            Plex sync page
          </Link>
        </div>

        {loading && !events ? (
          <div className="flex justify-center py-16">
            <Loader2 className="h-8 w-8 animate-spin text-shelf-muted" />
          </div>
        ) : error ? (
          <p className="text-sm text-amber-200/90">{error}</p>
        ) : !events?.length ? (
          <p className="text-sm text-shelf-muted rounded-xl border border-dashed border-shelf-border p-8 text-center">
            No playback events in this window. Watch something on Plex with webhooks configured, or widen the date range.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-shelf-border bg-shelf-card/30">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-shelf-border text-[11px] uppercase tracking-wide text-shelf-muted">
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">Time</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">Event</th>
                  <th className="px-3 py-2.5 font-medium min-w-[200px]">What</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap hidden sm:table-cell">Account</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap hidden md:table-cell">Player</th>
                  <th className="px-3 py-2.5 font-medium whitespace-nowrap">Library</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-shelf-border/80">
                {events.map((row) => (
                  <tr key={row.id} className="hover:bg-shelf-card/40">
                    <td className="px-3 py-2.5 text-shelf-muted whitespace-nowrap align-top tabular-nums">
                      {formatWhen(row.createdAt)}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      <span
                        className={`inline-flex rounded-md px-1.5 py-0.5 text-xs font-medium ${
                          row.event === "media.scrobble"
                            ? "bg-emerald-500/20 text-emerald-200"
                            : row.event === "media.play"
                              ? "bg-cyan-500/15 text-cyan-200"
                              : "bg-shelf-border/60 text-shelf-muted"
                        }`}
                      >
                        {formatEvent(row.event)}
                      </span>
                    </td>
                    <td className="px-3 py-2.5 text-white align-top">
                      <span className="line-clamp-2">{detailLine(row)}</span>
                    </td>
                    <td className="px-3 py-2.5 text-shelf-muted align-top hidden sm:table-cell">
                      {row.accountTitle ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 text-shelf-muted align-top hidden md:table-cell">
                      {row.playerTitle ?? "—"}
                    </td>
                    <td className="px-3 py-2.5 align-top">
                      {row.mediaId && row.linkedTitle ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-200/90">
                          <CheckCircle2 size={14} />
                          <Link
                            href={
                              row.linkedType === "tv"
                                ? `/series?open=${encodeURIComponent(row.mediaId)}`
                                : `/movies?open=${encodeURIComponent(row.mediaId)}`
                            }
                            className="hover:underline truncate max-w-[140px] inline-block align-bottom"
                          >
                            {row.linkedTitle}
                          </Link>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-xs text-shelf-muted">
                          <CircleSlash size={14} />
                          Unmatched
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <p className="text-[11px] text-shelf-muted">
          Tip: enable <code className="text-[10px]">PLEX_WEBHOOK_LOG_RAW</code> on the server for raw JSON in Docker
          logs when debugging.
        </p>
      </div>
    </div>
  );
}
