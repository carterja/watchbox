import { NextRequest, NextResponse } from "next/server";
import { getTmdbPopularMovies, getTmdbPopularTv, getTmdbTrending, getTmdbNowPlaying, getTmdbTopMovies, getTmdbTopTv, getTmdbAiringToday } from "@/lib/tmdb";

export const dynamic = "force-dynamic";
export const revalidate = 3600; // Cache for 1 hour

export async function GET(request: NextRequest) {
  try {
    // Check if client sent cache headers
    const ifNoneMatch = request.headers.get('if-none-match');
    
    const [topMovies, topTv, popularMovies, popularTv, trendingWeek, nowPlaying, airingToday] = await Promise.all([
      getTmdbTopMovies(),
      getTmdbTopTv(),
      getTmdbPopularMovies(),
      getTmdbPopularTv(),
      getTmdbTrending("week"),
      getTmdbNowPlaying(),
      getTmdbAiringToday(),
    ]);

    const data = {
      top: { movies: topMovies, tv: topTv },
      popular: { movies: popularMovies, tv: popularTv },
      trending: trendingWeek,
      nowPlaying,
      airingToday,
    };

    // Generate ETag for cache validation
    const etag = `"lists-${Date.now()}"`;
    
    if (ifNoneMatch === etag) {
      return new NextResponse(null, { status: 304 });
    }

    return NextResponse.json(data, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=7200',
        'ETag': etag,
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TMDB request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
