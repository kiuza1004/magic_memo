// public/icon.svg → 192/512/180 PNG로 변환.
// 사용: node scripts/generate-icons.mjs
import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const src = join(root, "public", "icon.svg");
const svg = await readFile(src);

const targets = [
  { name: "icon-192.png", size: 192 },
  { name: "icon-512.png", size: 512 },
  { name: "apple-touch-icon.png", size: 180 },
];

for (const { name, size } of targets) {
  const out = await sharp(svg, { density: 384 })
    .resize(size, size, { fit: "contain", background: "#0a0a0a" })
    .png()
    .toBuffer();
  await writeFile(join(root, "public", name), out);
  console.log(`✓ ${name} (${size}×${size})`);
}
