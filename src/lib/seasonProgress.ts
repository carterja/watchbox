import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import type { MediaStatus, SeasonProgressItem } from "@/types/media";

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

/** Update WatchBox season grid when Plex reports an episode scrobble (linked Media row). */
export async function applyEpisodeWatchedFromPlexWebhook(
  mediaId: string,
  season: number,
  episode: number
): Promise<void> {
  const media = await prisma.media.findUnique({
    where: { id: mediaId },
    select: { seasonProgress: true, totalSeasons: true, status: true, type: true },
  });
  if (!media || media.type !== "tv") return;

  const parsed = backfillSeasonProgressAfterEpisodeWatched(
    media.seasonProgress as SeasonProgressItem[] | null,
    media.totalSeasons,
    season,
    episode
  );
  if (!parsed) return;

  const nextStatus: MediaStatus =
    media.status === "yet_to_start" ? "in_progress" : (media.status as MediaStatus);

  await prisma.media.update({
    where: { id: mediaId },
    data: {
      seasonProgress: parsed.seasonProgress as Prisma.InputJsonValue,
      totalSeasons: parsed.totalSeasons,
      ...(nextStatus !== media.status ? { status: nextStatus } : {}),
    },
  });
}
