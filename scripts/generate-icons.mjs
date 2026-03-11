#!/usr/bin/env node
/**
 * Generate favicon.ico, apple-touch-icon.png, and PWA icons from public/favicon.svg.
 * Run: npm run generate-icons
 */
import sharp from "sharp";
import toIco from "to-ico";
import { readFile, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const publicDir = join(root, "public");
const svgPath = join(publicDir, "favicon.svg");

const sizes = [
  { name: "apple-touch-icon.png", size: 180 },
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "favicon-96x96.png", size: 96 },
];

async function main() {
  const svg = await readFile(svgPath);

  for (const { name, size } of sizes) {
    const outPath = join(publicDir, name);
    await sharp(svg)
      .resize(size, size)
      .png()
      .toFile(outPath);
    console.log("Wrote", name);
  }

  // favicon.ico (16 and 32)
  const png16 = await sharp(svg).resize(16, 16).png().toBuffer();
  const png32 = await sharp(svg).resize(32, 32).png().toBuffer();
  const ico = await toIco([png16, png32]);
  await writeFile(join(publicDir, "favicon.ico"), ico);
  console.log("Wrote favicon.ico");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
