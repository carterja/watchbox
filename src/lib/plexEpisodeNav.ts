import { getTmdbTvSeason } from "@/lib/tmdb";

/**
 * Given Plex’s **current** in-progress episode (On Deck), return the **previous** episode
 * in air order (the one you’d have finished before starting this one). Used to sync WatchBox
 * “last watched” to match Plex without treating the in-progress file as already completed.
 *
 * Returns null when there is no prior episode (e.g. S1E1, or S0E1).
 */
export async function previousEpisodeBeforeCurrent(
  tmdbId: number,
  season: number,
  episode: number
): Promise<{ season: number; episode: number } | null> {
  if (!Number.isFinite(season) || !Number.isFinite(episode)) return null;
  if (episode < 1 || season < 0) return null;

  if (episode > 1) {
    return { season, episode: episode - 1 };
  }

  // episode === 1
  if (season <= 1) {
    return null;
  }

  const prevSeason = season - 1;
  const data = await getTmdbTvSeason(tmdbId, prevSeason);
  const count = data?.episode_count ?? data?.episodes?.length ?? 0;
  if (count < 1) return null;
  return { season: prevSeason, episode: count };
}
