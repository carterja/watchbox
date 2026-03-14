import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const revalidate = 0;

/** GET /api/health - for Docker healthcheck and monitoring. Checks DB; optionally TMDB. */
export async function GET() {
  const result: { ok: boolean; db: boolean; tmdb?: boolean } = {
    ok: true,
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

  return NextResponse.json(result);
}
