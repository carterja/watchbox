import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { promoteMediaToFrontOfWatchingQueue } from "@/lib/promoteMediaSort";
import { maxEpisodeRef, type EpisodeRef } from "@/lib/whatNext";
import type { MediaStatus, SeasonProgressItem } from "@/types/media";

function episodeRefFromManual(
  s: number | null | undefined,
  e: number | null | undefined
): EpisodeRef | null {
  if (s == null || e == null) return null;
  if (s < 1 || e < 1) return null;
  return { season: s, episode: e };
}

/** Merge WatchBox manual last-watched with a Plex scrobble (max by S then E). */
export function mergeManualLastWatchedWithPlex(
  manualSeason: number | null | undefined,
  manualEpisode: number | null | undefined,
  plexSeason: number,
  plexEpisode: number
): EpisodeRef | null {
  const manual = episodeRefFromManual(manualSeason, manualEpisode);
  const plex =
    plexSeason >= 1 && plexEpisode >= 1 ? { season: plexSeason, episode: plexEpisode } : null;
  if (!plex) return manual;
  return maxEpisodeRef(manual, plex);
}

/**
 * After watching S×E, assume prior seasons were watched: mark seasons 1..S-1 completed.
 * Current season S is marked in_progress (unless already completed).
 * Does not downgrade existing completed seasons.
 */
export function backfillSeasonProgressAfterEpisodeWatched(
  current: SeasonProgressItem[] | null | undefined,
  totalSeasons: number | null | undefined,
  season: number,
  episode: number
): { seasonProgress: SeasonProgressItem[]; totalSeasons: number } | null {
  if (season < 1 || episode < 1 || !Number.isFinite(season) || !Number.isFinite(episode)) {
    return null;
  }

  const existingMax = (current ?? []).reduce((m, r) => Math.max(m, r.season), 0);
  const maxSeason = Math.max(season, totalSeasons ?? 0, existingMax);

  const bySeason = new Map<number, SeasonProgressItem["status"]>();
  for (const row of current ?? []) {
    if (row.season >= 1) bySeason.set(row.season, row.status);
  }

  for (let s = 1; s < season; s++) {
    bySeason.set(s, "completed");
  }

  const curStatus = bySeason.get(season);
  if (curStatus !== "completed") {
    bySeason.set(season, "in_progress");
  }

  const out: SeasonProgressItem[] = [];
  for (let s = 1; s <= maxSeason; s++) {
    out.push({
      season: s,
      status: bySeason.get(s) ?? "not_started",
    });
  }

  return { seasonProgress: out, totalSeasons: maxSeason };
}

/** Update WatchBox season grid, manual last-watched, and progress note from a Plex episode scrobble. */
export async function applyEpisodeWatchedFromPlexWebhook(
  mediaId: string,
  season: number,
  episode: number
): Promise<void> {
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: {
      seasonProgress: true,
      totalSeasons: true,
      status: true,
      type: true,
      manualLastWatchedSeason: true,
      manualLastWatchedEpisode: true,
    },
  });
  if (!media || media.type !== "tv") return;

  // Plex "Season 0" = specials — no season grid row; only note.
  if (season === 0 && episode >= 1) {
    await prisma.$transaction(async (tx) => {
      await tx.media.update({
        where: { id: mediaId },
        data: { progressNote: `Specials E${episode} (Plex)`, lastProgressSource: "plex" },
      });
      await promoteMediaToFrontOfWatchingQueue(tx, mediaId);
    });
    return;
  }

  const parsed = backfillSeasonProgressAfterEpisodeWatched(
    media.seasonProgress as SeasonProgressItem[] | null,
    media.totalSeasons,
    season,
    episode
  );
  if (!parsed) return;

  const nextStatus: MediaStatus =
    media.status === "yet_to_start" ? "in_progress" : (media.status as MediaStatus);

  const merged = mergeManualLastWatchedWithPlex(
    media.manualLastWatchedSeason,
    media.manualLastWatchedEpisode,
    season,
    episode
  );
  const progressNote = merged ? `S${merged.season} E${merged.episode}` : undefined;

  await prisma.$transaction(async (tx) => {
    await tx.media.update({
      where: { id: mediaId },
      data: {
        seasonProgress: parsed.seasonProgress as Prisma.InputJsonValue,
        totalSeasons: parsed.totalSeasons,
        lastProgressSource: "plex",
        ...(nextStatus !== media.status ? { status: nextStatus } : {}),
        ...(merged
          ? {
              manualLastWatchedSeason: merged.season,
              manualLastWatchedEpisode: merged.episode,
            }
          : {}),
        ...(progressNote ? { progressNote } : {}),
      },
    });
    await promoteMediaToFrontOfWatchingQueue(tx, mediaId);
  });
}

/** Mark a movie as finished from a Plex scrobble (threshold passed). */
export async function applyMovieScrobbleFromPlexWebhook(mediaId: string): Promise<void> {
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: { status: true, type: true },
  });
  if (!media || media.type !== "movie") return;

  const cur = media.status as MediaStatus;
  const nextStatus: MediaStatus =
    cur === "yet_to_start" || cur === "in_progress" ? "finished" : cur;

  await prisma.media.update({
    where: { id: mediaId },
    data: {
      lastProgressSource: "plex",
      ...(nextStatus !== cur ? { status: nextStatus } : {}),
      progressNote: "Watched on Plex",
    },
  });
}
