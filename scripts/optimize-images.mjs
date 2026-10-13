/**
 * One-off image optimisation (dev-only; re-run when an artwork changes):
 *   node scripts/optimize-images.mjs
 * Writes a .webp next to each source PNG in src/assets. Artwork is never
 * cropped or recoloured; alpha is preserved. Quality steps down only until
 * the size budget is met.
 */
import { statSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const dir = join(resolve(dirname(fileURLToPath(import.meta.url)), ".."), "src/assets");

const JOBS = [
  { file: "billboard-its-all-marketing.png", budget: 80, maxWidth: 1600 },
  { file: "logo-dipnsip.png", budget: 40, maxWidth: 720 },
  { file: "logo-wrepd.png", budget: 40, maxWidth: 720 },
  { file: "logo-synkk.png", budget: 40, maxWidth: 720 },
  { file: "logo-inayat.png", budget: 40, maxWidth: 720 },
  { file: "cert-hlbs.png", budget: 140, maxWidth: 1600 },
];

for (const job of JOBS) {
  const src = join(dir, job.file);
  const out = src.replace(/\.png$/, ".webp");
  const meta = await sharp(src).metadata();
  const width = Math.min(meta.width ?? job.maxWidth, job.maxWidth);
  let quality = 90;
  let size = Infinity;
  while (quality >= 50) {
    await sharp(src)
      .resize({ width, withoutEnlargement: true })
      .webp({ quality, alphaQuality: 100, effort: 6, smartSubsample: true })
      .toFile(out);
    size = statSync(out).size / 1024;
    if (size <= job.budget) break;
    quality -= 5;
  }
  const from = statSync(src).size / 1024;
  console.log(
    `${job.file.padEnd(34)} ${meta.width}px → ${width}px  ${from.toFixed(0)} kB → ${size.toFixed(0)} kB (q${quality})`
  );
}
