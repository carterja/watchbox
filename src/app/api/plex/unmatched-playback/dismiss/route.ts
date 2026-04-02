import { z } from "zod";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const BodySchema = z.object({
  dedupeKey: z.string().min(1).max(512),
});

/** POST — hide this unmatched Plex fingerprint until you clear the row in the DB. */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return Response.json({ error: "Expected JSON body" }, { status: 400 });
  }

  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return Response.json({ error: "Invalid body: dedupeKey required" }, { status: 400 });
  }

  const { dedupeKey } = parsed.data;

  await prisma.unmatchedPlaybackDismissal.upsert({
    where: { dedupeKey },
    create: { dedupeKey },
    update: {},
  });

  return Response.json({ ok: true });
}
