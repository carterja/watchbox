import { prisma } from "@/lib/db";
import { resolveWhatNextForMedia } from "@/lib/whatNext";

export const dynamic = "force-dynamic";

const BATCH = 4;

async function mapPool<T, R>(items: T[], limit: number, fn: (t: T) => Promise<R>): Promise<R[]> {
  const out: R[] = [];
  for (let i = 0; i < items.length; i += limit) {
    const chunk = items.slice(i, i + limit);
    out.push(...(await Promise.all(chunk.map(fn))));
  }
  return out;
}

export async function GET() {
  try {
    const rows = await prisma.media.findMany({
      where: { type: "tv", status: "in_progress" },
      orderBy: [{ watchingSortOrder: "asc" }, { updatedAt: "desc" }],
    });

    const items = await mapPool(rows, BATCH, async (m) => {
      const { next, caughtUp, lastFinished } = await resolveWhatNextForMedia({
        id: m.id,
        tmdbId: m.tmdbId,
        manualLastWatchedSeason: m.manualLastWatchedSeason,
        manualLastWatchedEpisode: m.manualLastWatchedEpisode,
        seasonProgress: m.seasonProgress,
        totalSeasons: m.totalSeasons,
      });
      return {
        mediaId: m.id,
        title: m.title,
        posterPath: m.posterPath,
        tmdbId: m.tmdbId,
        next,
        caughtUp,
        lastFinished,
      };
    });

    return Response.json(items, { headers: { "Cache-Control": "no-store" } });
  } catch (e) {
    console.error("what-next failed:", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
