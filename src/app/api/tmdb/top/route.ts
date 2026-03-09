import { NextRequest, NextResponse } from "next/server";
import { getTmdbTopMovies, getTmdbTopTv } from "@/lib/tmdb";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export async function GET() {
  try {
    const [movies, tv] = await Promise.all([getTmdbTopMovies(), getTmdbTopTv()]);
    return NextResponse.json({ movies, tv }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TMDB request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
