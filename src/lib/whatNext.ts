import { prisma } from "@/lib/db";
import { getTmdbTvDetails, getTmdbTvSeason, type TmdbSeasonEpisode } from "@/lib/tmdb";
import type { SeasonProgressItem } from "@/types/media";

export type EpisodeRef = { season: number; episode: number };

// Simple in-memory cache for TMDB TV season details (cleared on process restart)
const seasonCache = new Map<string, Awaited<ReturnType<typeof getTmdbTvSeason>>>();
const detailsCache = new Map<number, Awaited<ReturnType<typeof getTmdbTvDetails>>>();

function getCacheKey(tmdbId: number, season: number): string {
  return `${tmdbId}-s${season}`;
}

/** Get TMDB TV season, with in-memory caching to avoid redundant API calls. */
async function getTmdbTvSeasonCached(tmdbId: number, season: number) {
  const key = getCacheKey(tmdbId, season);
  if (seasonCache.has(key)) {
    return seasonCache.get(key);
  }
  const result = await getTmdbTvSeason(tmdbId, season);
  seasonCache.set(key, result);
  return result;
}

/** Get TMDB TV details, with in-memory caching. */
async function getTmdbTvDetailsCached(tmdbId: number) {
  if (detailsCache.has(tmdbId)) {
    return detailsCache.get(tmdbId);
  }
  const result = await getTmdbTvDetails(tmdbId);
  detailsCache.set(tmdbId, result);
  return result;
}

export type NextEpisodeInfo = EpisodeRef & {
  name: string;
  airDate: string | null;
  overview: string | null;
  /** TMDB still path (use `posterUrl` / image.tmdb.org). */
  stillPath: string | null;
  runtimeMinutes: number | null;
};

function nextInfoFromTmdbEpisode(season: number, e: TmdbSeasonEpisode): NextEpisodeInfo {
  return {
    season,
    episode: e.episode_number,
    name: e.name,
    airDate: e.air_date,
    overview: e.overview,
    stillPath: e.still_path,
    runtimeMinutes: e.runtime,
  };
}

/** Row shape from GET /api/what-next (client + UI). */
export type WhatNextRow = {
  mediaId: string;
  title: string;
  posterPath: string | null;
  tmdbId: number;
  next: NextEpisodeInfo | null;
  caughtUp: boolean;
  lastFinished: { season: number; episode: number } | null;
};

export function compareEpisode(a: EpisodeRef, b: EpisodeRef): number {
  if (a.season !== b.season) return a.season - b.season;
  return a.episode - b.episode;
}

export function maxEpisodeRef(a: EpisodeRef | null, b: EpisodeRef | null): EpisodeRef | null {
  if (!a) return b;
  if (!b) return a;
  return compareEpisode(a, b) >= 0 ? a : b;
}

/** Max (season, episode) from Plex PlaybackEvent rows for this show. */
export async function getPlexMaxFinished(mediaId: string, tmdbId: number): Promise<EpisodeRef | null> {
  const rows = await prisma.playbackEvent.findMany({
    where: {
      OR: [{ mediaId }, { tmdbId, mediaKind: "tv" }],
      season: { gte: 1 },
      episode: { gte: 1 },
    },
    select: { season: true, episode: true },
  });
  let best: EpisodeRef | null = null;
  for (const r of rows) {
    if (r.season == null || r.episode == null) continue;
    const cur = { season: r.season, episode: r.episode };
    best = maxEpisodeRef(best, cur);
  }
  return best;
}

/** Last-watched position from WatchBox manual fields (not season grid inference). */
export function manualEpisodeRef(
  manualSeason: number | null | undefined,
  manualEpisode: number | null | undefined
): EpisodeRef | null {
  if (manualSeason == null || manualEpisode == null) return null;
  if (manualSeason < 1 || manualEpisode < 1) return null;
  return { season: manualSeason, episode: manualEpisode };
}

/**
 * Season-progress–only inference: first non-completed season S → last finished is end of S-1 if S>1.
 * If all TMDB seasons marked completed in seasonProgress → last ep of final season.
 */
export async function lastFinishedFromSeasonProgress(
  seasonProgress: SeasonProgressItem[] | null | undefined,
  tmdbId: number,
  numberOfSeasons: number
): Promise<EpisodeRef | null> {
  if (numberOfSeasons < 1) return null;
  const map = new Map<number, SeasonProgressItem["status"]>();
  for (const r of seasonProgress ?? []) {
    map.set(r.season, r.status);
  }

  for (let s = 1; s <= numberOfSeasons; s++) {
    const st = map.get(s) ?? "not_started";
    if (st === "completed") continue;
    if (s === 1) return null;
    const prev = await getTmdbTvSeasonCached(tmdbId, s - 1);
    const cnt = prev?.episode_count ?? 0;
    if (cnt < 1) return null;
    return { season: s - 1, episode: cnt };
  }

  const lastSeason = await getTmdbTvSeasonCached(tmdbId, numberOfSeasons);
  const cnt = lastSeason?.episode_count ?? 0;
  if (cnt < 1) return null;
  return { season: numberOfSeasons, episode: cnt };
}

/** Compute single episode after `last` (null = before S1E1). */
export async function nextEpisodeAfter(
  tmdbId: number,
  last: EpisodeRef | null,
  numberOfSeasons: number
): Promise<NextEpisodeInfo | null> {
  if (numberOfSeasons < 1) return null;

  if (last === null) {
    const s1 = await getTmdbTvSeasonCached(tmdbId, 1);
    if (!s1?.episodes.length) return null;
    const e = s1.episodes[0];
    return nextInfoFromTmdbEpisode(1, e);
  }

  const cur = await getTmdbTvSeasonCached(tmdbId, last.season);
  if (!cur) return null;

  if (last.episode < cur.episode_count) {
    const ep = cur.episodes.find((x) => x.episode_number === last.episode + 1);
    if (!ep) return null;
    return nextInfoFromTmdbEpisode(last.season, ep);
  }

  if (last.season < numberOfSeasons) {
    const nextS = await getTmdbTvSeasonCached(tmdbId, last.season + 1);
    if (!nextS?.episodes.length) return null;
    const e = nextS.episodes[0];
    return nextInfoFromTmdbEpisode(last.season + 1, e);
  }

  return null;
}

export type MediaWhatNextInput = {
  id: string;
  tmdbId: number;
  manualLastWatchedSeason: number | null;
  manualLastWatchedEpisode: number | null;
  seasonProgress: unknown;
  totalSeasons: number | null;
};

/**
 * After advancing manual progress to `lastFinished`, compute the carousel row without re-querying
 * Plex or re-running full season-progress inference (used by mark-watched POST response).
 * Pass `numberOfSeasons` when already known (e.g. right after `resolveWhatNextForMedia`) to skip an extra TMDB details fetch.
 */
export async function whatNextRowAfterManualAdvance(
  media: {
    id: string;
    title: string;
    posterPath: string | null;
    tmdbId: number;
  },
  lastFinished: EpisodeRef,
  numberOfSeasonsHint?: number
): Promise<WhatNextRow> {
  let numberOfSeasons = numberOfSeasonsHint;
  if (numberOfSeasons == null) {
    const details = await getTmdbTvDetails(media.tmdbId);
    numberOfSeasons = details?.number_of_seasons ?? 0;
  }
  const next = await nextEpisodeAfter(media.tmdbId, lastFinished, numberOfSeasons);
  const caughtUp = lastFinished != null && next == null;
  return {
    mediaId: media.id,
    title: media.title,
    posterPath: media.posterPath,
    tmdbId: media.tmdbId,
    next,
    caughtUp,
    lastFinished,
  };
}

export async function resolveWhatNextForMedia(
  m: MediaWhatNextInput
): Promise<{
  lastFinished: EpisodeRef | null;
  next: NextEpisodeInfo | null;
  caughtUp: boolean;
  numberOfSeasons: number;
}> {
  const sp = (m.seasonProgress ?? null) as SeasonProgressItem[] | null;

  const details = await getTmdbTvDetails(m.tmdbId);
  const numberOfSeasons = details?.number_of_seasons ?? 0;
  if (numberOfSeasons < 1) {
    return { lastFinished: null, next: null, caughtUp: true, numberOfSeasons };
  }

  const plexMax = await getPlexMaxFinished(m.id, m.tmdbId);
  const manualMax = manualEpisodeRef(m.manualLastWatchedSeason, m.manualLastWatchedEpisode);
  const spMax = await lastFinishedFromSeasonProgress(sp, m.tmdbId, numberOfSeasons);

  const lastFinished = maxEpisodeRef(maxEpisodeRef(plexMax, manualMax), spMax);
  const next = await nextEpisodeAfter(m.tmdbId, lastFinished, numberOfSeasons);
  const caughtUp = lastFinished != null && next == null;

  return { lastFinished, next, caughtUp, numberOfSeasons };
}
