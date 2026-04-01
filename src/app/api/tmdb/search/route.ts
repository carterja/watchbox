import { NextRequest, NextResponse } from "next/server";
import { searchTmdb } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q?.trim()) return NextResponse.json([]);
  const typeParam = request.nextUrl.searchParams.get("type");
  const typeFilter = typeParam === "movie" || typeParam === "tv" ? typeParam : "all";
  try {
    const results = await searchTmdb(q.trim(), typeFilter);
    /** Nested shape matches Discover, AddMediaModal, and TmdbRematchPanel. */
    const transformed = results.map((result) => {
      if (result.type === "movie") {
        return {
          type: "movie" as const,
          data: {
            id: result.data.id,
            title: result.data.title,
            overview: result.data.overview ?? null,
            poster_path: result.data.poster_path ?? null,
            release_date: result.data.release_date ?? null,
          },
        };
      }
      return {
        type: "tv" as const,
        data: {
          id: result.data.id,
          name: result.data.name,
          overview: result.data.overview ?? null,
          poster_path: result.data.poster_path ?? null,
          first_air_date: result.data.first_air_date ?? null,
        },
      };
    });
    return NextResponse.json(transformed, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TMDB request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
