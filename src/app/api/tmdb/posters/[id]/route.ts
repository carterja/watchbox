import { NextRequest } from "next/server";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(_request.url);
    const type = searchParams.get("type") || "movie";
    
    const apiKey = process.env.TMDB_API_KEY;
    if (!apiKey) {
      return Response.json({ error: "TMDB API key not configured" }, { status: 500 });
    }
    
    const endpoint = type === "tv" ? "tv" : "movie";
    const res = await fetch(
      `https://api.themoviedb.org/3/${endpoint}/${id}/images?api_key=${apiKey}`
    );
    
    if (!res.ok) {
      return Response.json({ error: "Failed to fetch posters" }, { status: res.status });
    }
    
    const data = await res.json();
    
    return Response.json(
      { posters: data.posters || [] },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (error) {
    console.error("Failed to fetch posters:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
