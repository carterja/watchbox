import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { promoteMediaToFrontOfWatchingQueue } from "@/lib/promoteMediaSort";
import { resolveWhatNextForMedia, whatNextRowAfterManualAdvance } from "@/lib/whatNext";
import { z } from "zod";

export const dynamic = "force-dynamic";

const BodySchema = z
  .object({
    season: z.number().int().min(1).optional(),
    episode: z.number().int().min(1).optional(),
  })
  .strict()
  .refine(
    (d) =>
      (d.season == null && d.episode == null) ||
      (d.season != null && d.episode != null),
    { message: "Provide both season and episode, or omit both" }
  );

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) return Response.json({ error: "Invalid ID" }, { status: 400 });

    let body: unknown = {};
    try {
      const t = await request.text();
      if (t.trim()) body = JSON.parse(t);
    } catch {
      return Response.json({ error: "Invalid JSON" }, { status: 400 });
    }

    const parsed = BodySchema.safeParse(body);
    if (!parsed.success) {
      return Response.json({ error: "Invalid body", details: parsed.error.issues }, { status: 400 });
    }

    const media = await prisma.media.findUnique({ where: { id } });
    if (!media) return Response.json({ error: "Media not found" }, { status: 404 });
    if (media.type !== "tv") {
      return Response.json({ error: "Only TV series support episode marking" }, { status: 400 });
    }

    const { season, episode } = parsed.data;
    const explicit = season != null && episode != null;

    if (explicit) {
      const payload = await prisma.$transaction(async (tx) => {
        const updated = await tx.media.update({
          where: { id },
          data: {
            manualLastWatchedSeason: season,
            manualLastWatchedEpisode: episode,
          },
        });
        const watchingSortOrder = await promoteMediaToFrontOfWatchingQueue(tx, id);
        return { ...updated, watchingSortOrder };
      });
      const lastFinished = { season: season!, episode: episode! };
      const whatNextRow = await whatNextRowAfterManualAdvance(
        {
          id: payload.id,
          title: payload.title,
          posterPath: payload.posterPath,
          tmdbId: payload.tmdbId,
        },
        lastFinished
      );
      return Response.json({ ...payload, whatNextRow });
    }

    const { next, numberOfSeasons } = await resolveWhatNextForMedia({
      id: media.id,
      tmdbId: media.tmdbId,
      manualLastWatchedSeason: media.manualLastWatchedSeason,
      manualLastWatchedEpisode: media.manualLastWatchedEpisode,
      seasonProgress: media.seasonProgress,
      totalSeasons: media.totalSeasons,
    });

    if (!next) {
      return Response.json({ error: "No next episode to mark" }, { status: 400 });
    }

    const payload = await prisma.$transaction(async (tx) => {
      const updated = await tx.media.update({
        where: { id },
        data: {
          manualLastWatchedSeason: next.season,
          manualLastWatchedEpisode: next.episode,
        },
      });
      const watchingSortOrder = await promoteMediaToFrontOfWatchingQueue(tx, id);
      return { ...updated, watchingSortOrder };
    });
    const lastFinished = { season: next.season, episode: next.episode };
    const whatNextRow = await whatNextRowAfterManualAdvance(
      {
        id: payload.id,
        title: payload.title,
        posterPath: payload.posterPath,
        tmdbId: payload.tmdbId,
      },
      lastFinished,
      numberOfSeasons
    );
    return Response.json({ ...payload, whatNextRow });
  } catch (e) {
    console.error("mark-episode-watched:", e);
    return Response.json({ error: "Internal server error" }, { status: 500 });
  }
}
