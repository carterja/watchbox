import { getTmdbTvSeason } from "@/lib/tmdb";
import type { SeasonEpisodeCountItem } from "@/types/media";

/** Validate JSON from DB matches contiguous seasons 1..totalSeasons. */
export function parseSeasonEpisodeCountsJson(
  raw: unknown,
  totalSeasons: number | null
): SeasonEpisodeCountItem[] | null {
  if (totalSeasons == null || totalSeasons < 1) return null;
  if (!Array.isArray(raw) || raw.length !== totalSeasons) return null;
  const out: SeasonEpisodeCountItem[] = [];
  for (let i = 0; i < totalSeasons; i++) {
    const item = raw[i];
    if (!item || typeof item !== "object") return null;
    const season = (item as { season?: unknown }).season;
    const episodeCount = (item as { episodeCount?: unknown }).episodeCount;
    if (typeof season !== "number" || season !== i + 1) return null;
    if (typeof episodeCount !== "number" || !Number.isFinite(episodeCount) || episodeCount < 0) return null;
    out.push({ season, episodeCount });
  }
  return out;
}

/** Fetch per-season episode counts from TMDB (parallel per season). */
export async function fetchSeasonEpisodeCountsFromTmdb(
  tmdbId: number,
  seasonTotal: number
): Promise<SeasonEpisodeCountItem[]> {
  if (seasonTotal < 1) return [];
  const seasons = await Promise.all(
    Array.from({ length: seasonTotal }, (_, i) => {
      const seasonNum = i + 1;
      return getTmdbTvSeason(tmdbId, seasonNum).then((data) => ({
        season: seasonNum,
        episodeCount: Math.max(0, data?.episode_count ?? 0),
      }));
    })
  );
  return seasons;
}
