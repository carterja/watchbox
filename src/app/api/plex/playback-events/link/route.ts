import { z } from "zod";
import { prisma } from "@/lib/db";
import { inferUnmatchedKind } from "@/lib/unmatchedPlaybackDedupe";

export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    eventId: z.string().min(1),
    mediaId: z.string().min(1),
    /** Link all unmatched events for the same Plex show/movie fingerprint (grandparentRatingKey or ratingKey). */
    scope: z.enum(["single", "fingerprint"]).optional().default("single"),
  })
  .strict();

/**
 * POST /api/plex/playback-events/link — Attach a PlaybackEvent row (or all with same Plex fingerprint) to a
 * library Media row when auto-match failed (e.g. Plex title "Bluey (2018)" vs WatchBox "Bluey").
 */
export async function POST(request: Request) {
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

  const { eventId, mediaId, scope } = parsed.data;

  const [event, media] = await Promise.all([
    prisma.playbackEvent.findUnique({ where: { id: eventId } }),
    prisma.media.findUnique({ where: { id: mediaId } }),
  ]);

  if (!event) return Response.json({ error: "Playback event not found" }, { status: 404 });
  if (!media) return Response.json({ error: "Media not found" }, { status: 404 });
  if (event.mediaId != null) {
    return Response.json({ error: "Event is already linked to a library title" }, { status: 400 });
  }

  const inferredKind = inferUnmatchedKind({
    mediaKind: event.mediaKind,
    showTitle: event.showTitle,
    grandparentRatingKey: event.grandparentRatingKey,
  });

  if (media.type !== inferredKind) {
    return Response.json(
      {
        error:
          inferredKind === "tv"
            ? "This Plex activity is a TV episode — pick a series from your library."
            : "This Plex activity is a movie — pick a movie from your library.",
      },
      { status: 400 }
    );
  }

  const data = {
    mediaId: media.id,
    tmdbId: media.tmdbId,
    mediaKind: media.type as "movie" | "tv",
  };

  if (scope === "fingerprint") {
    if (inferredKind === "tv" && event.grandparentRatingKey?.trim()) {
      const r = await prisma.playbackEvent.updateMany({
        where: {
          mediaId: null,
          grandparentRatingKey: event.grandparentRatingKey,
        },
        data,
      });
      return Response.json({ ok: true, updated: r.count, scope: "fingerprint" });
    }
    if (inferredKind === "movie" && event.ratingKey?.trim()) {
      const r = await prisma.playbackEvent.updateMany({
        where: {
          mediaId: null,
          ratingKey: event.ratingKey,
        },
        data,
      });
      return Response.json({ ok: true, updated: r.count, scope: "fingerprint" });
    }
    // No stable Plex key — fall through to single
  }

  await prisma.playbackEvent.update({
    where: { id: eventId },
    data,
  });

  return Response.json({ ok: true, updated: 1, scope: "single" });
}
