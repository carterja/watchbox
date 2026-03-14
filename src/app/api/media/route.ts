import { NextRequest } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
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

    // Check for duplicates
    const existing = await prisma.media.findFirst({
      where: { tmdbId: validated.tmdbId, type: validated.type },
    });

    if (existing) {
      return Response.json({ error: "Already in your list" }, { status: 409 });
    }

    const { _max } = await prisma.media.aggregate({ _max: { sortOrder: true } });
    const nextSortOrder = ((_max?.sortOrder ?? 0) + 1) | 0;

    const media = await prisma.media.create({
      data: {
        tmdbId: validated.tmdbId,
        type: validated.type,
        title: validated.title,
        overview: validated.overview ?? null,
        posterPath: validated.posterPath ?? null,
        releaseDate: validated.releaseDate ?? null,
        status: validated.status,
        totalSeasons: validated.type === "tv" ? validated.totalSeasons ?? null : null,
        streamingService: validated.streamingService && validated.streamingService.trim() ? validated.streamingService.trim() : null,
        viewer: validated.viewer ?? null,
        sortOrder: nextSortOrder,
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
