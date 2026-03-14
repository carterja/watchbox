import { NextRequest, NextResponse } from "next/server";
import { getTmdbWatchProviders } from "@/lib/tmdb";

export const dynamic = "force-dynamic";

const MAX_ITEMS = 60;

type BatchItem = { type: "movie" | "tv"; id: number };

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const items = Array.isArray((body as { items?: BatchItem[] }).items)
    ? (body as { items: BatchItem[] }).items
    : [];
  const region =
    typeof (body as { region?: string }).region === "string"
      ? (body as { region: string }).region
      : "US";

  const valid: BatchItem[] = [];
  const seen = new Set<string>();
  for (const item of items.slice(0, MAX_ITEMS)) {
    if (item?.type !== "movie" && item?.type !== "tv") continue;
    const id = typeof item.id === "number" ? item.id : parseInt(String(item.id), 10);
    if (Number.isNaN(id) || id < 1) continue;
    const key = `${item.type}-${id}`;
    if (seen.has(key)) continue;
    seen.add(key);
    valid.push({ type: item.type, id });
  }

  if (valid.length === 0) {
    return NextResponse.json({ providers: {} });
  }

  try {
    const results = await Promise.all(
      valid.map(async (item) => {
        const providers = await getTmdbWatchProviders(item.type, item.id, region);
        return { key: `${item.type}-${item.id}`, providers };
      })
    );

    const providers: Record<string, string[]> = {};
    for (const { key, providers: list } of results) {
      providers[key] = list;
    }

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
