import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";
import { UpdateMediaSchema } from "@/lib/validation";
import { z } from "zod";

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate ID format (UUIDs or cuid)
    if (!id || typeof id !== "string") {
      return Response.json({ error: "Invalid ID" }, { status: 400 });
    }
    
    const body = await request.json();

    // Validate input
    const validated = UpdateMediaSchema.parse(body);

    const existing = await prisma.media.findUnique({ where: { id } });
    if (!existing) {
      return Response.json({ error: "Media not found" }, { status: 404 });
    }

    // Build update data
    const data: Prisma.MediaUpdateInput = {};
    if (validated.tmdbId !== undefined) data.tmdbId = validated.tmdbId;
    if (validated.title !== undefined) data.title = validated.title;
    if (validated.overview !== undefined) data.overview = validated.overview ?? null;
    if (validated.releaseDate !== undefined) data.releaseDate = validated.releaseDate ?? null;
    if (validated.status !== undefined) data.status = validated.status;
    if (validated.progressNote !== undefined) data.progressNote = validated.progressNote;
    if (validated.totalSeasons !== undefined) {
      data.totalSeasons = validated.totalSeasons;
      if (existing.totalSeasons !== validated.totalSeasons) {
        data.seasonEpisodeCounts = Prisma.JsonNull;
      }
    }
    if (validated.streamingService !== undefined) data.streamingService = validated.streamingService;
    if (validated.viewer !== undefined) data.viewer = validated.viewer;
    if (validated.posterPath !== undefined) data.posterPath = validated.posterPath;
    if (validated.seasonProgress !== undefined) {
      data.seasonProgress = validated.seasonProgress as Prisma.InputJsonValue;
    }
    if (validated.manualLastWatchedSeason !== undefined) {
      data.manualLastWatchedSeason = validated.manualLastWatchedSeason;
    }
    if (validated.manualLastWatchedEpisode !== undefined) {
      data.manualLastWatchedEpisode = validated.manualLastWatchedEpisode;
    }
    if (validated.personalNotes !== undefined) {
      data.personalNotes = validated.personalNotes;
    }

    if (validated.progressSource !== undefined) {
      data.lastProgressSource = validated.progressSource;
    } else {
      const progressChanged =
        (validated.progressNote !== undefined && validated.progressNote !== existing.progressNote) ||
        (validated.manualLastWatchedSeason !== undefined &&
          validated.manualLastWatchedSeason !== existing.manualLastWatchedSeason) ||
        (validated.manualLastWatchedEpisode !== undefined &&
          validated.manualLastWatchedEpisode !== existing.manualLastWatchedEpisode) ||
        (validated.seasonProgress !== undefined &&
          JSON.stringify(validated.seasonProgress ?? null) !==
            JSON.stringify(existing.seasonProgress ?? null));
      if (progressChanged) {
        data.lastProgressSource = "manual";
      }
    }

    // Update media
    const media = await prisma.media.update({
      where: { id },
      data,
    });

    return Response.json(media);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return Response.json({ 
        error: "Invalid input", 
        details: error.issues 
      }, { status: 400 });
    }
    
    console.error("Failed to update media:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    // Validate ID format
    if (!id || typeof id !== "string") {
      return Response.json({ error: "Invalid ID" }, { status: 400 });
    }
    
    await prisma.media.delete({ where: { id } });
    return Response.json({ ok: true });
  } catch (error) {
    // Prisma not found error
    if ((error as { code?: string }).code === "P2025") {
      return Response.json({ error: "Media not found" }, { status: 404 });
    }
    
    console.error("Failed to delete media:", error);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
