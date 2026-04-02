"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Activity,
  ExternalLink,
  Film,
  Loader2,
  Link2,
  PlusCircle,
  Radio,
  ScrollText,
  Tv,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { PlexIntegrationPanel } from "@/components/PlexIntegrationPanel";
import { PlexWebhookLogPanel } from "@/components/plex/PlexWebhookLogPanel";

const TAB_IDS = ["sync", "activity", "unmatched", "logs"] as const;
type PlexTabId = (typeof TAB_IDS)[number];

function isTabId(s: string | null): s is PlexTabId {
  return s != null && (TAB_IDS as readonly string[]).includes(s);
}

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

type UnmatchedPlaybackItem = {
  dedupeKey: string;
  mediaKind: "movie" | "tv";
  displayTitle: string;
  subtitle: string | null;
  lastActivityAt: string;
  lastEvent: string;
  tmdbId: number | null;
  discoverQuery: string;
  discoverType: "movie" | "tv";
};

function formatWhen(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
}

export function PlexHubClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const tabParam = searchParams.get("tab");
  const activeTab: PlexTabId = isTabId(tabParam) ? tabParam : "sync";

  const setTab = useCallback(
    (id: PlexTabId) => {
      router.replace(`/plex?tab=${id}`, { scroll: false });
    },
    [router]
  );

  const [activity, setActivity] = useState<ActivityPayload | null>(null);
  const [activityLoading, setActivityLoading] = useState(true);
  const [unmatched, setUnmatched] = useState<UnmatchedPlaybackItem[] | null>(null);
  const [unmatchedLoading, setUnmatchedLoading] = useState(true);
  const [relinking, setRelinking] = useState(false);
  const [dismissingKey, setDismissingKey] = useState<string | null>(null);

  const loadPlexData = useCallback(async () => {
    setActivityLoading(true);
    setUnmatchedLoading(true);
    try {
      const [aRes, uRes] = await Promise.all([
        fetch("/api/plex/activity"),
        fetch("/api/plex/unmatched-playback?days=14&limit=40"),
      ]);
      if (aRes.ok) setActivity((await aRes.json()) as ActivityPayload);
      if (uRes.ok) {
        const u = (await uRes.json()) as { items: UnmatchedPlaybackItem[] };
        setUnmatched(Array.isArray(u.items) ? u.items : []);
      } else {
        setUnmatched([]);
      }
    } finally {
      setActivityLoading(false);
      setUnmatchedLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPlexData();
  }, [loadPlexData]);

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
      await loadPlexData();
    } catch {
      toast.error("Relink failed");
    } finally {
      setRelinking(false);
    }
  }, [loadPlexData]);

  const dismissUnmatched = useCallback(async (dedupeKey: string) => {
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
  }, []);

  return (
    <div className="min-h-screen pb-8">
      <div className="border-b border-shelf-border bg-shelf-bg/95 px-3 pt-3 pb-0 sm:px-4 md:px-6">
        <h1 className="text-lg font-semibold text-white sm:text-xl md:text-2xl">Plex hub</h1>
        <p className="text-xs text-shelf-muted mt-1 max-w-2xl">
          Sync with your server, inspect webhook activity, and debug playback. See also{" "}
          <Link href="/overview" className="text-shelf-accent hover:underline">
            Overview
          </Link>{" "}
          for a compact health summary.
        </p>
        <nav className="mt-4 flex flex-wrap gap-1 border-t border-shelf-border/60 pt-3 -mb-px">
          {(
            [
              { id: "sync" as const, label: "Sync", icon: Radio },
              { id: "activity" as const, label: "Activity", icon: Activity },
              { id: "unmatched" as const, label: "Not in WatchBox", icon: PlusCircle },
              { id: "logs" as const, label: "Webhook log", icon: ScrollText },
            ] satisfies { id: PlexTabId; label: string; icon: typeof Radio }[]
          ).map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-1.5 rounded-t-lg border border-b-0 px-3 py-2 text-xs font-medium sm:text-sm transition ${
                activeTab === id
                  ? "border-shelf-border bg-shelf-card/80 text-white"
                  : "border-transparent text-shelf-muted hover:text-white"
              }`}
            >
              <Icon size={14} className="opacity-80" />
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div className="mx-auto max-w-4xl px-3 py-4 sm:px-4 md:p-6">
        <div className="overflow-hidden rounded-xl border border-shelf-border bg-shelf-bg/40 sm:rounded-2xl">
          {activeTab === "sync" ? (
            <PlexIntegrationPanel />
          ) : activeTab === "activity" ? (
            <div className="p-4 md:p-6 space-y-4">
              <h2 className="text-sm font-medium text-white">Webhook &amp; server activity</h2>
              {activityLoading && !activity ? (
                <Loader2 className="animate-spin text-shelf-muted" size={24} />
              ) : activity ? (
                <ul className="text-sm text-shelf-muted space-y-2 rounded-xl border border-shelf-border bg-shelf-card/40 p-4">
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
                      <code className="text-[11px] text-white/80">PLEX_WEBHOOK_ALLOWED_ACCOUNTS</code> are counted.
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
            </div>
          ) : activeTab === "unmatched" ? (
            <div className="p-4 md:p-6 space-y-4">
              <p className="text-xs text-shelf-muted max-w-xl">
                Recent Plex plays we couldn&apos;t attach to a library title. Add from Discover, then future scrobbles
                link automatically.
              </p>
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => void relinkPastPlayback()}
                  disabled={relinking}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-shelf-border bg-shelf-card/50 px-2.5 py-1.5 text-xs text-shelf-muted hover:text-white hover:bg-shelf-card disabled:opacity-50"
                >
                  {relinking ? <Loader2 size={12} className="animate-spin" /> : <Link2 size={12} />}
                  Relink past events
                </button>
              </div>
              {unmatchedLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="animate-spin text-shelf-muted" size={28} />
                </div>
              ) : !unmatched || unmatched.length === 0 ? (
                <p className="text-sm text-shelf-muted rounded-xl border border-dashed border-shelf-border p-8 text-center">
                  Nothing unmatched in the last 14 days.
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
                              </p>
                            </div>
                          </div>
                          <div className="flex shrink-0 flex-wrap items-center gap-2 sm:justify-end">
                            <button
                              type="button"
                              onClick={() => void dismissUnmatched(item.dedupeKey)}
                              disabled={dismissingKey === item.dedupeKey}
                              className="inline-flex items-center justify-center gap-1 rounded-lg border border-shelf-border bg-shelf-card/30 px-2.5 py-2 text-xs text-shelf-muted hover:text-white hover:bg-shelf-card disabled:opacity-50"
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
            </div>
          ) : (
            <div className="p-4 md:p-6">
              <PlexWebhookLogPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
