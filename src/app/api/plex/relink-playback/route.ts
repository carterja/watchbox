import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

/**
 * POST /api/plex/relink-playback — Attach `PlaybackEvent` rows that have a TMDB id + kind matching a
 * library title but `mediaId` is still null (e.g. events recorded before you added the show or fixed rematch).
 */
export async function POST() {
  const media = await prisma.media.findMany({
    select: { id: true, tmdbId: true, type: true },
  });

  let updated = 0;
  for (const m of media) {
    const mediaKind = m.type === "movie" ? "movie" : "tv";
    const r = await prisma.playbackEvent.updateMany({
      where: {
        mediaId: null,
        tmdbId: m.tmdbId,
        mediaKind,
      },
      data: { mediaId: m.id },
    });
    updated += r.count;
  }

  return Response.json({ ok: true, playbackEventsUpdated: updated });
}
