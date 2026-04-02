import { NextRequest } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/db";
import { applyEpisodeWatchedFromPlexWebhook } from "@/lib/seasonProgress";
import { previousEpisodeBeforeCurrent } from "@/lib/plexEpisodeNav";

const BodySchema = z.object({
  /** Plex `parentIndex` (season; 0 = specials). */
  season: z.number().int().min(0).max(200),
  /** Plex `index` (episode in season). */
  episode: z.number().int().min(1).max(500),
});

/**
 * POST — Apply WatchBox last-watched / season grid for the episode **before** Plex’s current
 * in-progress episode (On Deck). Does not mark the in-progress episode as finished.
 */
export const dynamic = "force-dynamic";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string") {
      return Response.json({ error: "Invalid ID" }, { status: 400 });
    }

    let body: unknown;
    try {
      body = await request.json();
    } catch {
      return Response.json({ error: "Expected JSON body" }, { status: 400 });
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
    }
    const { season: plexSeason, episode: plexEpisode } = parsed.data;

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return Response.json({ error: "Media not found" }, { status: 404 });
    }
    if (media.type !== "tv") {
      return Response.json({ error: "Only TV series support episode sync" }, { status: 400 });
    }

    const prev = await previousEpisodeBeforeCurrent(media.tmdbId, plexSeason, plexEpisode);
    if (!prev) {
      return Response.json(
        {
          error: "no_previous_episode",
          message:
            "There is no episode before this position (e.g. S1E1 or first special). WatchBox was not changed.",
        },
        { status: 400 }
      );
    }

    await applyEpisodeWatchedFromPlexWebhook(id, prev.season, prev.episode);

    const updated = await prisma.media.findUnique({ where: { id } });
    return Response.json(updated);
  } catch (e) {
    console.error("sync-from-plex-on-deck failed:", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
