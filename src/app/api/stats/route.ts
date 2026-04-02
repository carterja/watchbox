import { prisma } from "@/lib/db";
import { withPlaybackAccountFilter } from "@/lib/plexWebhookAccountFilter";

/** GET /api/stats — aggregate counts for the Overview page. */
export const dynamic = "force-dynamic";

export async function GET() {
  const yearStart = new Date(new Date().getFullYear(), 0, 1);

  const [
    total,
    movies,
    tv,
    byStatus,
    finishedThisYear,
    playbackEventsLast30d,
  ] = await Promise.all([
    prisma.media.count(),
    prisma.media.count({ where: { type: "movie" } }),
    prisma.media.count({ where: { type: "tv" } }),
    prisma.media.groupBy({
      by: ["status"],
      _count: { _all: true },
    }),
    prisma.media.count({
      where: {
        status: "finished",
        updatedAt: { gte: yearStart },
      },
    }),
    prisma.playbackEvent.count({
      where: withPlaybackAccountFilter({
        event: "media.scrobble",
        createdAt: { gte: new Date(Date.now() - 30 * 86_400_000) },
      }) ?? {},
    }),
  ]);

  const statusCounts: Record<string, number> = {};
  for (const row of byStatus) {
    statusCounts[row.status] = row._count._all;
  }

  return Response.json(
    {
      total,
      movies,
      tv,
      statusCounts,
      finishedThisYear,
      plexScrobblesLast30Days: playbackEventsLast30d,
    },
    { headers: { "Cache-Control": "private, max-age=30, stale-while-revalidate=60" } }
  );
}
