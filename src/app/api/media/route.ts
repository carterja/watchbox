import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { CreateMediaSchema } from "@/lib/validation";
import { z } from "zod";

export async function GET() {
  const list = await prisma.media.findMany({ orderBy: { updatedAt: "desc" } });
  return Response.json(list);
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Validate input
    const validated = CreateMediaSchema.parse(body);
    
    // Check for duplicates
    const existing = await prisma.media.findFirst({
      where: { tmdbId: validated.tmdbId, type: validated.type },
    });
    
    if (existing) {
      return Response.json({ error: "Already in your list" }, { status: 409 });
    }
    
    // Create media
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
        streamingService: validated.streamingService ?? null,
        viewer: validated.viewer ?? null,
      },
    });
    
    return Response.json(media, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ 
        error: "Invalid input", 
        details: error.issues 
      }, { status: 400 });
    }
    
    console.error("Failed to create media:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
