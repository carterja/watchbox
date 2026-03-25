import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getTmdbTvDetails } from "@/lib/tmdb";
import { fetchSeasonEpisodeCountsFromTmdb, parseSeasonEpisodeCountsJson } from "@/lib/seasonEpisodeCounts";

/**
 * GET /api/media/[id]/tv-season-episodes
 * Returns TMDB episode counts per season for dropdowns (set last watched, etc.).
 * Uses DB cache (`seasonEpisodeCounts`) when valid; otherwise fetches TMDB and persists.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id || typeof id !== "string") {
      return Response.json({ error: "Invalid ID" }, { status: 400 });
    }

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) {
      return Response.json({ error: "Not found" }, { status: 404 });
    }
    if (media.type !== "tv") {
      return Response.json({ error: "Not a TV series" }, { status: 400 });
    }

    const cached = parseSeasonEpisodeCountsJson(media.seasonEpisodeCounts, media.totalSeasons);
    if (cached && cached.length > 0) {
      return Response.json({ seasons: cached });
    }

    let seasonTotal = media.totalSeasons;
    if (seasonTotal == null || seasonTotal < 1) {
      const details = await getTmdbTvDetails(media.tmdbId);
      seasonTotal = details?.number_of_seasons ?? null;
    }
    if (seasonTotal == null || seasonTotal < 1) {
      return Response.json({ error: "Season count unknown — sync seasons from Settings or Series." }, { status: 400 });
    }

    const seasons = await fetchSeasonEpisodeCountsFromTmdb(media.tmdbId, seasonTotal);

    await prisma.media.update({
      where: { id },
      data: {
        totalSeasons: seasonTotal,
        seasonEpisodeCounts: seasons,
      },
    });

    return Response.json({ seasons });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("tv-season-episodes:", e);
    const hint =
      /seasonEpisodeCounts|Unknown column|does not exist/i.test(msg)
        ? " Run `npx prisma db push` and restart the dev server."
        : "";
    return Response.json(
      {
        error: `Failed to load season data.${hint}`,
        details: process.env.NODE_ENV === "development" ? msg : undefined,
      },
      { status: 500 }
    );
  }
}
