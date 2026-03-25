import type { Prisma } from "@prisma/client";

/**
 * Move one media row to the front of the global sort order with a single write:
 * set sortOrder to (min(sortOrder) − 1). No full-table renumbering.
 */
export async function promoteMediaToFrontOfList(
  tx: Prisma.TransactionClient,
  mediaId: string
): Promise<number> {
  const minRow = await tx.media.aggregate({ _min: { sortOrder: true } });
  const next = (minRow._min.sortOrder ?? 0) - 1;
  await tx.media.update({
    where: { id: mediaId },
    data: { sortOrder: next },
  });
  return next;
}
