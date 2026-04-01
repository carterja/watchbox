import { prisma } from "@/lib/db";
import { isPlexConfigured } from "@/lib/plex";
import { getMergedPlexOnDeckItems } from "@/lib/plexMergedOnDeck";
import { isPlexScrobbleEquivalent } from "@/lib/plexScrobble";
import {
  applyEpisodeWatchedFromPlexWebhook,
  applyMovieScrobbleFromPlexWebhook,
} from "@/lib/seasonProgress";

/**
 * POST /api/plex/sync-watched — Poll Plex On Deck + partial library (same merge as GET on-deck)
 * and apply WatchBox updates for items past the scrobble threshold (~90%). Use when webhooks
 * were missed (server down, network). Does not replace webhooks for real-time updates.
 */
export const dynamic = "force-dynamic";

export async function POST() {
  if (!isPlexConfigured()) {
    return Response.json({ error: "Plex not configured", updated: 0 }, { status: 503 });
  }

  try {
    const { items, onDeckCount, libraryPartialCount, watchboxMatchCount } =
      await getMergedPlexOnDeckItems();

    let updated = 0;
    const seenTv = new Set<string>();
    const seenMovie = new Set<string>();

    for (const item of items) {
      if (item.type === "movie" && item.tmdbType === "movie" && item.tmdbId != null) {
        if (!isPlexScrobbleEquivalent(item.viewOffset, item.duration)) continue;
        const row = await prisma.media.findFirst({
          where: { tmdbId: item.tmdbId, type: "movie" },
          select: { id: true },
        });
        if (!row) continue;
        if (seenMovie.has(row.id)) continue;
        seenMovie.add(row.id);
        await applyMovieScrobbleFromPlexWebhook(row.id);
        updated += 1;
        continue;
      }

      if (item.type !== "episode" || item.tmdbType !== "tv" || item.tmdbId == null) continue;

      const season = item.parentIndex;
      const episode = item.index;
      if (season == null || episode == null) continue;
      if (!isPlexScrobbleEquivalent(item.viewOffset, item.duration)) continue;

      const row = await prisma.media.findFirst({
        where: { tmdbId: item.tmdbId, type: "tv" },
        select: { id: true },
      });
      if (!row) continue;

      const dedupe = `${row.id}:${season}:${episode}`;
      if (seenTv.has(dedupe)) continue;
      seenTv.add(dedupe);

      await applyEpisodeWatchedFromPlexWebhook(row.id, season, episode);
      updated += 1;
    }

    return Response.json({
      ok: true,
      updated,
      onDeckCount,
      libraryPartialCount,
      watchboxMatchCount,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Plex sync failed";
    return Response.json({ error: message, updated: 0 }, { status: 502 });
  }
}
