import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { getTmdbTvDetails } from "@/lib/tmdb";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/** Backfill totalSeasons for TV series that don't have it. Fetches from TMDB and updates DB. */
export async function POST() {
  const list = await prisma.media.findMany({
    where: {
      type: "tv",
      OR: [{ totalSeasons: null }, { totalSeasons: 0 }],
    },
    select: { id: true, tmdbId: true, title: true },
  });

  let updated = 0;
  let failed = 0;

  for (const media of list) {
    try {
      const details = await getTmdbTvDetails(media.tmdbId);
      if (details?.number_of_seasons != null && details.number_of_seasons > 0) {
        await prisma.media.update({
          where: { id: media.id },
          data: { totalSeasons: details.number_of_seasons },
        });
        updated++;
      }
      await new Promise((r) => setTimeout(r, 200));
    } catch {
      failed++;
    }
  }

  return NextResponse.json({
    updated,
    failed,
    total: list.length,
  });
}
