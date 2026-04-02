import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { APP_VERSION } from "@/lib/version";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** GET /api/health - for Docker healthcheck and monitoring. Checks DB; optionally TMDB. */
export async function GET() {
  const result: {
    ok: boolean;
    version: string;
    db: boolean;
    tmdb?: boolean;
    plex?: boolean;
  } = {
    ok: true,
    version: APP_VERSION,
    db: false,
  };

  try {
    await prisma.$queryRaw`SELECT 1`;
    result.db = true;
  } catch {
    result.ok = false;
    return NextResponse.json(result, { status: 503 });
  }

  const checkTmdb = typeof process.env.TMDB_API_KEY === "string" && process.env.TMDB_API_KEY.trim().length > 0;
  if (checkTmdb) {
    try {
      const res = await fetch(
        `https://api.themoviedb.org/3/configuration?api_key=${process.env.TMDB_API_KEY}`
      );
      result.tmdb = res.ok;
    } catch {
      result.tmdb = false;
    }
  }

  const plexUrl = process.env.PLEX_SERVER_URL?.trim();
  const plexToken = process.env.PLEX_TOKEN?.trim();
  if (plexUrl && plexToken) {
    try {
      const base = plexUrl.replace(/\/+$/, "");
      const res = await fetch(`${base}/identity`, {
        headers: { "X-Plex-Token": plexToken },
        cache: "no-store",
        signal: AbortSignal.timeout(5000),
      });
      result.plex = res.ok;
    } catch {
      result.plex = false;
    }
  }

  return NextResponse.json(result);
}
