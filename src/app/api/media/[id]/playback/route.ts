import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";

/**
 * GET /api/media/[id]/playback — Plex scrobble history for this title (append-only; survives Plex deletions).
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string") {
      return Response.json({ error: "Invalid ID" }, { status: 400 });
    }

    const media = await prisma.media.findUnique({
      where: { id },
      select: { tmdbId: true, type: true },
    });
    if (!media) {
      return Response.json({ error: "Media not found" }, { status: 404 });
    }

    const kind = media.type === "movie" ? "movie" : "tv";

    const events = await prisma.playbackEvent.findMany({
      where: {
        OR: [{ mediaId: id }, { tmdbId: media.tmdbId, mediaKind: kind }],
      },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        createdAt: true,
        event: true,
        title: true,
        showTitle: true,
        season: true,
        episode: true,
        accountTitle: true,
        playerTitle: true,
      },
    });

    const seen = new Set<string>();
    const deduped = events.filter((e) => {
      if (seen.has(e.id)) return false;
      seen.add(e.id);
      return true;
    });

    return Response.json(deduped, {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (e) {
    console.error("playback list failed:", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
