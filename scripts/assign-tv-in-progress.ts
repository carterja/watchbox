/**
 * Set all TV series to "in_progress" except the one that stays checked (Traitors).
 * Leaves movies unchanged.
 *
 * Run with: npx tsx scripts/assign-tv-in-progress.ts
 * Uses DATABASE_URL from .env (e.g. file:./dev.db or file:/app/data/watchbox.db).
 */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { PrismaClient } from "@prisma/client";

// Load .env if present (so DATABASE_URL is set when run via npx tsx)
const envPath = resolve(process.cwd(), ".env");
if (existsSync(envPath)) {
  const env = readFileSync(envPath, "utf8");
  for (const line of env.split("\n")) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, "");
  }
}

const prisma = new PrismaClient();

/** Title of the TV series to leave unchanged (the "checked" one). */
const EXCEPT_TITLE = "Traitors";

async function main() {
  // Update all TV series to in_progress except EXCEPT_TITLE
  const result = await prisma.media.updateMany({
    where: {
      type: "tv",
      title: { not: EXCEPT_TITLE },
    },
    data: { status: "in_progress" },
  });

  console.log(`Updated ${result.count} TV series to "in_progress" (left "${EXCEPT_TITLE}" unchanged).`);

  // Count movies (unchanged)
  const movieCount = await prisma.media.count({ where: { type: "movie" } });
  console.log(`Movies left unchanged: ${movieCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
