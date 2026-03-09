import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import type { Prisma } from "@prisma/client";
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
    
    // Build update data
    const data: Prisma.MediaUpdateInput = {};
    if (validated.status !== undefined) data.status = validated.status;
    if (validated.progressNote !== undefined) data.progressNote = validated.progressNote;
    if (validated.totalSeasons !== undefined) data.totalSeasons = validated.totalSeasons;
    if (validated.streamingService !== undefined) data.streamingService = validated.streamingService;
    if (validated.viewer !== undefined) data.viewer = validated.viewer;
    if (validated.seasonProgress !== undefined) {
      data.seasonProgress = validated.seasonProgress as Prisma.InputJsonValue;
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
    
    // Prisma not found error
    if ((error as { code?: string }).code === "P2025") {
      return Response.json({ error: "Media not found" }, { status: 404 });
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
