import { prisma } from "@/lib/db";
import type { PlexPlaybackLogRow } from "@/types/plexPlaybackLog";

export const dynamic = "force-dynamic";

/**
 * GET /api/plex/playback-logs — Recent Plex webhook PlaybackEvent rows (play / pause / stop / scrobble).
 * Query: limit (default 150, max 500), days (optional, only events newer than N days).
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const limit = Math.min(500, Math.max(1, parseInt(url.searchParams.get("limit") ?? "150", 10) || 150));
  const daysRaw = url.searchParams.get("days");
  const days =
    daysRaw != null && daysRaw !== ""
      ? Math.min(365, Math.max(1, parseInt(daysRaw, 10) || 30))
      : null;

  const since = days != null ? new Date(Date.now() - days * 86_400_000) : undefined;

  const rows = await prisma.playbackEvent.findMany({
    where: since ? { createdAt: { gte: since } } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      media: { select: { id: true, title: true, type: true } },
    },
  });

  const events: PlexPlaybackLogRow[] = rows.map((r) => ({
    id: r.id,
    createdAt: r.createdAt.toISOString(),
    event: r.event,
    title: r.title,
    showTitle: r.showTitle,
    season: r.season,
    episode: r.episode,
    year: r.year,
    accountTitle: r.accountTitle,
    playerTitle: r.playerTitle,
    mediaId: r.mediaId,
    mediaKind: r.mediaKind,
    tmdbId: r.tmdbId,
    linkedTitle: r.media?.title ?? null,
    linkedType: r.media?.type ?? null,
  }));

  return Response.json(
    { events, limit, days: days ?? null },
    { headers: { "Cache-Control": "no-store" } }
  );
}
