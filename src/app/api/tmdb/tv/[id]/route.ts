import { NextRequest } from "next/server";
import { getTmdbTvDetails } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const tvId = parseInt(id, 10);
  if (Number.isNaN(tvId)) {
    return Response.json({ error: "Invalid TV ID" }, { status: 400 });
  }
  try {
    const details = await getTmdbTvDetails(tvId);
    if (!details) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json({
      number_of_seasons: details.number_of_seasons,
      name: details.name,
      overview: details.overview,
      poster_path: details.poster_path,
      first_air_date: details.first_air_date,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "TMDB request failed";
    return Response.json({ error: message }, { status: 502 });
  }
}
