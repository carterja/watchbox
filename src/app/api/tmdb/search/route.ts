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
    return NextResponse.json(results, {
      headers: {
        'Cache-Control': 'public, s-maxage=300, stale-while-revalidate=600',
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TMDB request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
