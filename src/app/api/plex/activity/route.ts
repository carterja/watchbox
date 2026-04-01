import { prisma } from "@/lib/db";
import { fetchPlex, isPlexConfigured } from "@/lib/plex";

/** GET /api/plex/activity — webhook / scrobble health from PlaybackEvent + Plex reachability. */
export const dynamic = "force-dynamic";

export async function GET() {
  const webhookSecretConfigured = Boolean(process.env.PLEX_WEBHOOK_SECRET?.trim());

  const day = 86_400_000;
  const now = Date.now();

  const [totalPlaybackEvents, latest, last24h, last7d, plexConfigured] = await Promise.all([
    prisma.playbackEvent.count(),
    prisma.playbackEvent.findFirst({
      where: { event: "media.scrobble" },
      orderBy: { createdAt: "desc" },
      select: { createdAt: true },
    }),
    prisma.playbackEvent.count({
      where: { createdAt: { gte: new Date(now - day) } },
    }),
    prisma.playbackEvent.count({
      where: { createdAt: { gte: new Date(now - 7 * day) } },
    }),
    Promise.resolve(isPlexConfigured()),
  ]);

  let plexReachable = false;
  if (plexConfigured) {
    try {
      await fetchPlex("/identity");
      plexReachable = true;
    } catch {
      plexReachable = false;
    }
  }

  return Response.json(
    {
      webhookSecretConfigured,
      plexConfigured,
      plexReachable,
      lastScrobbleAt: latest?.createdAt.toISOString() ?? null,
      playbackEventsTotal: totalPlaybackEvents,
      playbackEventsLast24h: last24h,
      playbackEventsLast7d: last7d,
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
