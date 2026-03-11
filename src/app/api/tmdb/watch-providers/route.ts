import { NextRequest, NextResponse } from "next/server";
import { getTmdbWatchProviders } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const type = request.nextUrl.searchParams.get("type");
  const idParam = request.nextUrl.searchParams.get("id");
  const region = request.nextUrl.searchParams.get("region") ?? "US";

  if (type !== "movie" && type !== "tv") {
    return NextResponse.json({ error: "type must be movie or tv" }, { status: 400 });
  }
  const id = idParam ? parseInt(idParam, 10) : NaN;
  if (Number.isNaN(id) || id < 1) {
    return NextResponse.json({ error: "id must be a positive number" }, { status: 400 });
  }

  try {
    const providers = await getTmdbWatchProviders(type, id, region);
    return NextResponse.json(
      { providers },
      {
        headers: {
          "Cache-Control": "public, s-maxage=86400, stale-while-revalidate=604800",
        },
      }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "TMDB request failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
