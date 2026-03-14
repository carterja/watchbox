import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const orderedIds = Array.isArray((body as { orderedIds?: unknown }).orderedIds)
    ? ((body as { orderedIds: unknown[] }).orderedIds as string[])
    : [];

  if (orderedIds.length === 0) {
    return NextResponse.json({ ok: true });
  }

  const validIds = orderedIds.filter((id) => typeof id === "string" && id.length > 0);
  if (validIds.length === 0) {
    return NextResponse.json({ error: "orderedIds must be a non-empty array of strings" }, { status: 400 });
  }

  try {
    await prisma.$transaction(
      validIds.map((id, index) =>
        prisma.media.update({
          where: { id },
          data: { sortOrder: index },
        })
      )
    );
    return NextResponse.json({ ok: true });
  } catch (err) {
    const code = (err as { code?: string })?.code;
    if (code === "P2025") {
      return NextResponse.json({ error: "One or more media items not found" }, { status: 404 });
    }
    console.error("Reorder failed:", err);
    return NextResponse.json({ error: "Failed to reorder" }, { status: 500 });
  }
}
