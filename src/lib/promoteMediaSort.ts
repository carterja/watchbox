import type { Prisma } from "@prisma/client";

/**
 * Move one TV row to the front of the Watching queue (`watchingSortOrder`) with a single write:
 * set watchingSortOrder to (min − 1). Does not change library shelf `sortOrder`.
 */
export async function promoteMediaToFrontOfWatchingQueue(
  tx: Prisma.TransactionClient,
  mediaId: string
): Promise<number> {
  const minRow = await tx.media.aggregate({ _min: { watchingSortOrder: true } });
  const next = (minRow._min.watchingSortOrder ?? 0) - 1;
  await tx.media.update({
    where: { id: mediaId },
    data: { watchingSortOrder: next },
  });
  return next;
}
