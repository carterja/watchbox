import { prisma } from "@/lib/db";
import {
  compareEpisode,
  getPlexMaxFinished,
  manualEpisodeRef,
  maxEpisodeRef,
} from "@/lib/whatNext";

/** GET /api/media/[id]/progress-insight — Plex vs manual episode position for conflict UI. */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  if (!id) {
    return Response.json({ error: "Invalid ID" }, { status: 400 });
  }

  const media = await prisma.media.findUnique({
    where: { id },
    select: {
      id: true,
      type: true,
      tmdbId: true,
      manualLastWatchedSeason: true,
      manualLastWatchedEpisode: true,
      lastProgressSource: true,
    },
  });

  if (!media) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  if (media.type !== "tv") {
    return Response.json({
      tv: false as const,
      lastProgressSource: media.lastProgressSource,
      plexMax: null,
      manualMax: null,
      merged: null,
      hasConflict: false,
    });
  }

  const plexMax = await getPlexMaxFinished(media.id, media.tmdbId);
  const manualMax = manualEpisodeRef(media.manualLastWatchedSeason, media.manualLastWatchedEpisode);
  const merged = maxEpisodeRef(plexMax, manualMax);
  const hasConflict = Boolean(
    plexMax && manualMax && compareEpisode(plexMax, manualMax) !== 0
  );

  return Response.json({
    tv: true as const,
    plexMax,
    manualMax,
    merged,
    hasConflict,
    lastProgressSource: media.lastProgressSource,
  });
}
