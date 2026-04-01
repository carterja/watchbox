"use client";

import { useEffect, useMemo, useState } from "react";
import { Heart, UsersRound, User, History, Loader2 } from "lucide-react";
import type { Media, MediaStatus, SeasonProgressItem, Viewer } from "@/types/media";
import { STREAMING_SERVICES } from "@/lib/constants";

const STATUS_OPTIONS: { value: MediaStatus; label: string }[] = [
  { value: "yet_to_start", label: "Unwatched" },
  { value: "in_progress", label: "In progress" },
  { value: "finished", label: "Finished" },
  { value: "rewatch", label: "Rewatch" },
];

const VIEWER_OPTIONS: { value: Viewer; label: string; Icon: typeof Heart }[] = [
  { value: "wife", label: "Wife", Icon: Heart },
  { value: "both", label: "Both", Icon: UsersRound },
  { value: "me", label: "Me", Icon: User },
];

type CastMember = {
  id: number;
  name: string;
  character: string;
  profile_path: string | null;
};

type PlexLogEntry = {
  id: string;
  createdAt: string;
  title: string | null;
  showTitle: string | null;
  season: number | null;
  episode: number | null;
  accountTitle: string | null;
  playerTitle: string | null;
};

export type FormState = {
  status: MediaStatus;
  streamingService: string | null;
  viewer: Viewer | null;
  totalSeasons: number;
  seasonProgress: SeasonProgressItem[];
  manualLastWatchedSeason: number | null;
  manualLastWatchedEpisode: number | null;
  progressNote: string;
};

type Props = {
  media: Media;
  currentTmdbId: number;
  state: FormState;
  onChange: (patch: Partial<FormState>) => void;
};

export function MediaDetailFormFields({ media, currentTmdbId, state, onChange }: Props) {
  const {
    status, streamingService, viewer, totalSeasons,
    seasonProgress, manualLastWatchedSeason, manualLastWatchedEpisode, progressNote,
  } = state;
  const isSeries = media.type === "tv";

  // Cast
  const [cast, setCast] = useState<CastMember[] | null>(null);
  const [loadingCast, setLoadingCast] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoadingCast(true);
    setCast(null);
    fetch(`/api/tmdb/credits?id=${currentTmdbId}&type=${isSeries ? "tv" : "movie"}`)
      .then((res) => res.json())
      .then((data: { cast?: CastMember[] }) => {
        if (!cancelled && data.cast) setCast(data.cast);
      })
      .finally(() => {
        if (!cancelled) setLoadingCast(false);
      });
    return () => { cancelled = true; };
  }, [currentTmdbId, isSeries]);

  // Plex playback log
  const [plexLog, setPlexLog] = useState<PlexLogEntry[]>([]);
  const [plexLogLoading, setPlexLogLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setPlexLogLoading(true);
    fetch(`/api/media/${encodeURIComponent(media.id)}/playback`)
      .then((r) => (r.ok ? r.json() : []))
      .then((data) => { if (!cancelled && Array.isArray(data)) setPlexLog(data); })
      .catch(() => { if (!cancelled) setPlexLog([]); })
      .finally(() => { if (!cancelled) setPlexLogLoading(false); });
    return () => { cancelled = true; };
  }, [media.id]);

  // Season data for episode picker
  const [seasonsData, setSeasonsData] = useState<{ season: number; episodeCount: number }[] | null>(null);
  const [seasonsLoading, setSeasonsLoading] = useState(false);
  const [seasonsError, setSeasonsError] = useState<string | null>(null);

  useEffect(() => {
    if (!isSeries || !media.id) { setSeasonsData(null); setSeasonsError(null); return; }
    let cancelled = false;
    setSeasonsLoading(true);
    setSeasonsError(null);
    void fetch(`/api/media/${encodeURIComponent(media.id)}/tv-season-episodes`)
      .then(async (res) => {
        const data = (await res.json()) as { seasons?: { season: number; episodeCount: number }[]; error?: string };
        if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : "Could not load seasons");
        if (!cancelled) setSeasonsData(data.seasons ?? []);
      })
      .catch((e: unknown) => {
        if (!cancelled) { setSeasonsData(null); setSeasonsError(e instanceof Error ? e.message : "Could not load seasons"); }
      })
      .finally(() => { if (!cancelled) setSeasonsLoading(false); });
    return () => { cancelled = true; };
  }, [isSeries, media.id]);

  // TMDB season count can increase after we first saved the show; API refreshes DB — align form grid + count input.
  useEffect(() => {
    if (!seasonsData?.length) return;
    const maxSeason = Math.max(...seasonsData.map((s) => s.season));
    if (maxSeason > totalSeasons) {
      onChange({ totalSeasons: maxSeason });
    }
  }, [seasonsData, totalSeasons, onChange]);

  const episodeMaxForSeason = useMemo(() => {
    if (!seasonsData?.length || manualLastWatchedSeason == null) return null;
    const row = seasonsData.find((s) => s.season === manualLastWatchedSeason);
    const c = row?.episodeCount ?? 0;
    return c > 0 ? c : 1;
  }, [seasonsData, manualLastWatchedSeason]);

  useEffect(() => {
    if (episodeMaxForSeason == null) return;
    if (manualLastWatchedEpisode == null) return;
    const clamped = Math.min(Math.max(1, manualLastWatchedEpisode), episodeMaxForSeason);
    if (clamped !== manualLastWatchedEpisode) onChange({ manualLastWatchedEpisode: clamped });
  }, [episodeMaxForSeason, manualLastWatchedEpisode, onChange]);

  const handleSeasonStatusChange = (season: number, newStatus: string) => {
    const next = seasonProgress.find((s) => s.season === season)
      ? seasonProgress.map((s) =>
          s.season === season ? { ...s, status: newStatus as SeasonProgressItem["status"] } : s
        )
      : [...seasonProgress, { season, status: newStatus as SeasonProgressItem["status"] }];
    onChange({ seasonProgress: next });
  };

  const getSeasonStatus = (season: number) =>
    seasonProgress.find((s) => s.season === season)?.status || "not_started";

  return (
    <>
      {/* Status */}
      <div>
        <label className="block text-xs md:text-sm font-medium text-white mb-2">Status</label>
        <div className="flex gap-1.5 md:gap-2">
          {STATUS_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange({ status: option.value })}
              className={`flex-1 px-2 md:px-4 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition ${
                status === option.value
                  ? "bg-[#8b5cf6] text-white"
                  : "bg-shelf-card text-shelf-muted hover:text-white border border-shelf-border"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      {/* Streaming Service */}
      <div>
        <label className="block text-xs md:text-sm font-medium text-white mb-2">Streaming Service</label>
        <select
          value={streamingService || ""}
          onChange={(e) => onChange({ streamingService: e.target.value || null })}
          className="w-full px-3 md:px-4 py-2 rounded-lg bg-shelf-card border border-shelf-border text-sm md:text-base text-white focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
        >
          <option value="">None</option>
          {STREAMING_SERVICES.map((service) => (
            <option key={service} value={service}>{service}</option>
          ))}
        </select>
      </div>

      {/* Viewer */}
      <div>
        <label className="block text-xs md:text-sm font-medium text-white mb-2">Viewer</label>
        <div className="flex gap-1.5 md:gap-2">
          {VIEWER_OPTIONS.map((option) => (
            <button
              key={option.value}
              onClick={() => onChange({ viewer: option.value })}
              className={`flex-1 px-2 md:px-4 py-2 md:py-2 rounded-lg text-xs md:text-sm font-medium transition inline-flex flex-col md:flex-row items-center justify-center gap-1 md:gap-2 ${
                viewer === option.value
                  ? option.value === "wife"
                    ? "bg-red-500/20 border-red-500/50 text-red-300 border-2"
                    : option.value === "both"
                    ? "bg-purple-500/20 border-purple-500/50 text-purple-300 border-2"
                    : "bg-sky-500/20 border-sky-500/50 text-sky-300 border-2"
                  : "bg-shelf-card text-shelf-muted hover:text-white border border-shelf-border"
              }`}
            >
              <option.Icon size={18} className="shrink-0 md:w-5 md:h-5" strokeWidth={2} />
              <span className="text-[10px] md:text-sm">{option.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Season Progress (TV only) */}
      {isSeries && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="text-xs md:text-sm font-medium text-white">Seasons</label>
            <input
              type="number"
              min="1"
              max="50"
              value={totalSeasons || ""}
              onChange={(e) => onChange({ totalSeasons: parseInt(e.target.value) || 0 })}
              className="w-16 md:w-20 px-2 md:px-3 py-1 rounded-lg bg-shelf-card border border-shelf-border text-white text-xs md:text-sm focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
              placeholder="0"
            />
          </div>
          {totalSeasons > 0 && (
            <>
              <p className="text-[11px] md:text-xs text-shelf-muted mb-2">
                Cycle each season button to mark not started / in progress / finished. Last watched position
                matches the Watching page (&quot;Set last watched&quot;) — same values, editable here.
              </p>
              <div className="mb-3 rounded-lg border border-shelf-border bg-shelf-card/40 p-3">
                <p className="text-[11px] font-medium text-cyan-200/90 mb-2">Last watched episode</p>
                {seasonsLoading ? (
                  <div className="flex flex-col items-center justify-center gap-2 py-6">
                    <Loader2 className="animate-spin text-cyan-400/90" size={24} aria-hidden />
                    <p className="text-xs text-shelf-muted">Loading seasons…</p>
                  </div>
                ) : seasonsData && seasonsData.length > 0 ? (
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                    <label className="flex-1 min-w-0">
                      <span className="text-xs text-shelf-muted">Season</span>
                      <select
                        className="mt-1 w-full cursor-pointer rounded-lg border border-shelf-border bg-shelf-bg px-3 py-2.5 text-sm text-white"
                        value={manualLastWatchedSeason ?? ""}
                        onChange={(e) => {
                          const v = e.target.value;
                          if (v === "") {
                            onChange({ manualLastWatchedSeason: null, manualLastWatchedEpisode: null });
                            return;
                          }
                          const s = Number(v);
                          const row = seasonsData.find((x) => x.season === s);
                          const max = Math.max(1, row?.episodeCount ?? 1);
                          const ep = manualLastWatchedEpisode == null ? 1 : Math.min(Math.max(1, manualLastWatchedEpisode), max);
                          onChange({ manualLastWatchedSeason: s, manualLastWatchedEpisode: ep });
                        }}
                      >
                        <option value="">Not set</option>
                        {seasonsData.map(({ season }) => (
                          <option key={season} value={season}>Season {season}</option>
                        ))}
                      </select>
                    </label>
                    {manualLastWatchedSeason != null && episodeMaxForSeason != null && (
                      <label className="flex-1 min-w-0">
                        <span className="text-xs text-shelf-muted">Episode</span>
                        <select
                          className="mt-1 w-full cursor-pointer rounded-lg border border-shelf-border bg-shelf-bg px-3 py-2.5 text-sm text-white"
                          value={manualLastWatchedEpisode ?? 1}
                          onChange={(e) => onChange({ manualLastWatchedEpisode: Number(e.target.value) || 1 })}
                        >
                          {Array.from({ length: episodeMaxForSeason }, (_, i) => i + 1).map((n) => (
                            <option key={n} value={n}>Episode {n}</option>
                          ))}
                        </select>
                      </label>
                    )}
                    <button
                      type="button"
                      onClick={() => onChange({ manualLastWatchedSeason: null, manualLastWatchedEpisode: null })}
                      className="shrink-0 rounded-lg px-3 py-2.5 text-xs text-shelf-muted hover:text-white sm:mb-0.5"
                    >
                      Clear
                    </button>
                  </div>
                ) : (
                  <>
                    {seasonsError && <p className="mb-2 text-xs text-amber-200/90">{seasonsError}</p>}
                    <p className="mb-2 text-xs text-shelf-muted">Enter season and episode manually (or sync seasons from Settings).</p>
                    <div className="flex flex-wrap gap-2 items-end">
                      <label className="flex-1 min-w-[6rem]">
                        <span className="text-xs text-shelf-muted">Season</span>
                        <input
                          type="number"
                          min={1}
                          className="mt-1 w-full rounded-lg border border-shelf-border bg-shelf-bg px-3 py-2 text-sm text-white"
                          value={manualLastWatchedSeason ?? ""}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            onChange({ manualLastWatchedSeason: Number.isFinite(n) ? n : null });
                          }}
                        />
                      </label>
                      <label className="flex-1 min-w-[6rem]">
                        <span className="text-xs text-shelf-muted">Episode</span>
                        <input
                          type="number"
                          min={1}
                          className="mt-1 w-full rounded-lg border border-shelf-border bg-shelf-bg px-3 py-2 text-sm text-white"
                          value={manualLastWatchedEpisode ?? ""}
                          onChange={(e) => {
                            const n = parseInt(e.target.value, 10);
                            onChange({ manualLastWatchedEpisode: Number.isFinite(n) ? n : null });
                          }}
                        />
                      </label>
                      <button
                        type="button"
                        onClick={() => onChange({ manualLastWatchedSeason: null, manualLastWatchedEpisode: null })}
                        className="text-xs text-shelf-muted hover:text-white underline-offset-2 hover:underline sm:mb-2"
                      >
                        Clear
                      </button>
                    </div>
                  </>
                )}
              </div>
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 gap-1.5 md:gap-2 max-h-48 md:max-h-64 overflow-y-auto p-2 rounded-lg bg-shelf-card/50 border border-shelf-border">
                {Array.from({ length: totalSeasons }, (_, i) => i + 1).map((season) => {
                  const seasonStatus = getSeasonStatus(season);
                  const manualHere = manualLastWatchedSeason != null && manualLastWatchedSeason === season;
                  return (
                    <button
                      key={season}
                      type="button"
                      onClick={() => {
                        const nextStatus =
                          seasonStatus === "not_started" ? "in_progress"
                          : seasonStatus === "in_progress" ? "completed"
                          : "not_started";
                        handleSeasonStatusChange(season, nextStatus);
                      }}
                      className={`px-2 md:px-3 py-1.5 md:py-2 rounded-lg text-xs md:text-sm font-medium transition ${
                        seasonStatus === "completed"
                          ? "bg-green-500/20 border-green-500/50 text-green-300 border"
                          : seasonStatus === "in_progress"
                            ? "bg-[#8b5cf6]/20 border-[#8b5cf6]/50 text-[#a78bfa] border"
                            : "bg-shelf-card text-shelf-muted border border-shelf-border"
                      } ${manualHere ? "ring-2 ring-cyan-400/90 ring-offset-2 ring-offset-shelf-card" : ""}`}
                      title={manualHere && manualLastWatchedEpisode != null ? `Last finished: S${season}E${manualLastWatchedEpisode}` : undefined}
                    >
                      S{season}
                      {manualHere && manualLastWatchedEpisode != null && (
                        <span className="block text-[9px] font-normal text-cyan-200/90 leading-tight">E{manualLastWatchedEpisode}</span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}

      {/* Cast */}
      <div>
        <label className="block text-xs md:text-sm font-medium text-white mb-2">Cast</label>
        {loadingCast ? (
          <p className="text-xs text-shelf-muted">Loading…</p>
        ) : cast && cast.length > 0 ? (
          <ul className="flex flex-wrap gap-x-3 gap-y-1 text-xs md:text-sm">
            {cast.map((member) => (
              <li key={member.id}>
                <a
                  href={`https://www.imdb.com/find?q=${encodeURIComponent(member.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[#8b5cf6] hover:text-[#a78bfa] hover:underline"
                >
                  {member.name}
                </a>
                {member.character && <span className="text-shelf-muted ml-1">({member.character})</span>}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-shelf-muted">No cast data</p>
        )}
      </div>

      {/* Plex log */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <History size={16} className="text-shelf-muted shrink-0" aria-hidden />
          <label className="text-xs md:text-sm font-medium text-white">Plex log</label>
        </div>
        {plexLogLoading ? (
          <p className="text-xs text-shelf-muted">Loading…</p>
        ) : plexLog.length === 0 ? (
          <p className="text-xs text-shelf-muted">
            No Plex scrobbles recorded yet. Add a webhook on your server and finish an episode
            or movie past the threshold — history is stored here even if you remove files from Plex later.
          </p>
        ) : (
          <ul className="max-h-40 overflow-y-auto space-y-1.5 text-xs md:text-sm rounded-lg border border-shelf-border bg-shelf-card/50 p-2">
            {plexLog.map((e) => {
              const when = new Date(e.createdAt);
              const dateStr = Number.isNaN(when.getTime()) ? ""
                : when.toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" });
              const epLabel = isSeries && e.season != null && e.episode != null && e.season > 0 && e.episode > 0
                ? `S${e.season}E${e.episode}` : isSeries ? "Episode" : null;
              const primary = isSeries && (e.title || epLabel)
                ? [epLabel, e.title].filter(Boolean).join(" · ") : e.title ?? media.title;
              return (
                <li key={e.id} className="text-shelf-muted">
                  <span className="text-white/90">{primary}</span>
                  {dateStr && <span className="text-shelf-muted"> · {dateStr}</span>}
                  {e.accountTitle && <span className="text-shelf-muted"> · {e.accountTitle}</span>}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Note */}
      <div>
        <label className="block text-xs md:text-sm font-medium text-white mb-2">Note</label>
        <input
          type="text"
          value={progressNote}
          onChange={(e) => onChange({ progressNote: e.target.value })}
          placeholder="Optional note about your progress..."
          className="w-full px-3 md:px-4 py-2 rounded-lg bg-shelf-card border border-shelf-border text-sm md:text-base text-white placeholder-shelf-muted focus:outline-none focus:ring-2 focus:ring-[#8b5cf6]"
        />
      </div>
    </>
  );
}
