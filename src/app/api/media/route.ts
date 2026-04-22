import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { mergeCreatePayloadWithTmdb } from "@/lib/enrichCreateMediaFromTmdb";
import { CreateMediaSchema } from "@/lib/validation";
import { z } from "zod";

export async function GET() {
  const list = await prisma.media.findMany({
    orderBy: [{ sortOrder: "asc" }, { updatedAt: "desc" }],
  });
  return new Response(JSON.stringify(list), {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "private, max-age=30, stale-while-revalidate=60",
    },
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  try {
    // Validate input
    const validated = CreateMediaSchema.parse(body);
    const enriched = await mergeCreatePayloadWithTmdb(validated);

    // Check for duplicates
    const existing = await prisma.media.findFirst({
      where: { tmdbId: enriched.tmdbId, type: enriched.type },
    });

    if (existing) {
      return Response.json({ error: "Already in your list" }, { status: 409 });
    }

    const { _max } = await prisma.media.aggregate({
      _max: { sortOrder: true, watchingSortOrder: true },
    });
    const nextSortOrder = ((_max?.sortOrder ?? 0) + 1) | 0;
    const nextWatchingSortOrder = ((_max?.watchingSortOrder ?? 0) + 1) | 0;

    const media = await prisma.media.create({
      data: {
        tmdbId: enriched.tmdbId,
        type: enriched.type,
        title: enriched.title,
        overview: enriched.overview ?? null,
        posterPath: enriched.posterPath ?? null,
        releaseDate: enriched.releaseDate ?? null,
        runtime: enriched.runtime ?? null,
        status: enriched.status,
        totalSeasons: enriched.type === "tv" ? enriched.totalSeasons ?? null : null,
        streamingService: enriched.streamingService && enriched.streamingService.trim() ? enriched.streamingService.trim() : null,
        viewer: enriched.viewer ?? null,
        sortOrder: nextSortOrder,
        watchingSortOrder: nextWatchingSortOrder,
      },
    });

    return Response.json(media, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({
        error: "Invalid input",
        details: error.issues,
      }, { status: 400 });
    }

    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      if (error.code === "P2002") {
        return Response.json({ error: "Already in your list" }, { status: 409 });
      }
    }
    if (error instanceof Prisma.PrismaClientInitializationError || (error && typeof error === "object" && "code" in error && String((error as { code: string }).code).startsWith("P1"))) {
      console.error("Database error creating media:", error);
      return Response.json({ error: "Database unavailable. Check server logs and database connection." }, { status: 503 });
    }

    console.error("Failed to create media:", error);
    const message = error instanceof Error ? error.message : "Unknown error";
    return Response.json(
      { error: process.env.NODE_ENV === "development" ? message : "Internal server error" },
      { status: 500 }
    );
  }
}
