import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTmdbTvDetails } from "@/lib/tmdb";
import { fetchSeasonEpisodeCountsFromTmdb, parseSeasonEpisodeCountsJson } from "@/lib/seasonEpisodeCounts";

export const dynamic = "force-dynamic";
export const maxDuration = 120;

function schemaHint(message: string): string {
  if (/seasonEpisodeCounts|Unknown column|does not exist/i.test(message)) {
    return " Database schema may be out of date — run `npx prisma db push` and restart the dev server.";
  }
  return "";
}

/** Backfill totalSeasons and per-season episode counts for TV. Fetches from TMDB and updates DB. */
export async function POST() {
  try {
    const allTv = await prisma.media.findMany({
      where: { type: "tv" },
      select: { id: true, tmdbId: true, title: true, totalSeasons: true, seasonEpisodeCounts: true },
    });

    const list = allTv.filter(
      (m) => parseSeasonEpisodeCountsJson(m.seasonEpisodeCounts, m.totalSeasons) == null
    );

    let updated = 0;
    let failed = 0;

    for (const media of list) {
      try {
        let seasonTotal =
          media.totalSeasons != null && media.totalSeasons > 0 ? media.totalSeasons : null;
        if (seasonTotal == null) {
          const details = await getTmdbTvDetails(media.tmdbId);
          seasonTotal =
            details?.number_of_seasons != null && details.number_of_seasons > 0
              ? details.number_of_seasons
              : null;
        }
        if (seasonTotal == null) {
          failed++;
          await new Promise((r) => setTimeout(r, 200));
          continue;
        }

        const seasons = await fetchSeasonEpisodeCountsFromTmdb(media.tmdbId, seasonTotal);
        await prisma.media.update({
          where: { id: media.id },
          data: { totalSeasons: seasonTotal, seasonEpisodeCounts: seasons },
        });
        updated++;
        await new Promise((r) => setTimeout(r, 200));
      } catch {
        failed++;
        await new Promise((r) => setTimeout(r, 200));
      }
    }

    return NextResponse.json({
      updated,
      failed,
      total: list.length,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("sync-seasons:", e);
    return NextResponse.json(
      {
        error: `Sync failed.${schemaHint(msg)}`,
        details: process.env.NODE_ENV === "development" ? msg : undefined,
      },
      { status: 500 }
    );
  }
}
