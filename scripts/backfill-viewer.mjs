#!/usr/bin/env node
/**
 * One-time backfill: set viewer = 'both' for any media where viewer is null or empty.
 * Safe to run multiple times. Used on deploy so existing DBs get updated.
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // SQLite: update rows where viewer is NULL or empty string
  const result = await prisma.$executeRawUnsafe(
    "UPDATE Media SET viewer = 'both' WHERE viewer IS NULL OR viewer = ''"
  );
  if (result > 0) {
    console.log("backfill-viewer: updated", result, "row(s) to viewer = 'both'");
  }
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error("backfill-viewer:", e);
    process.exit(1);
  });
