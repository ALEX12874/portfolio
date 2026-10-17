/**
 * Renders the live 3D hero into seamless 12 s video loops + posters, and
 * measures where the billboard sits in each video (src/data/heroHotspot.ts).
 *
 *   npm run build && npm run preview          # serves http://localhost:4173
 *   node scripts/render-hero.mjs [baseUrl]    # default http://127.0.0.1:4173
 *
 * Options:
 *   --only=phone|wide   render one variant (the hotspot file is always rewritten
 *                       for both, so the overlay stays in sync)
 *   --measure-only      skip rendering; only re-measure the billboard
 *   --encode-only       reuse frames kept by an earlier run (FRAMES_DIR)
 *
 * Uses an installed Chromium/Edge through playwright-core (no browser
 * download). Set CHROME_PATH to pick the browser. Outputs to src/assets/hero/:
 *   hero-wide.{mp4,webm,webp}   1280×1024 source
 *   hero-phone.{mp4,webm,webp}  960×864 source
 * Re-run only when the scene changes.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright-core";
import ffmpegPath from "ffmpeg-static";
import sharp from "sharp";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "src/assets/hero");
const base = (process.argv.slice(2).find((a) => a.startsWith("http")) || "http://127.0.0.1:4173").replace(/\/$/, "");
const FPS = Number(process.env.FPS || 24);
const ENCODE_ONLY = process.argv.includes("--encode-only");
const MEASURE_ONLY = process.argv.includes("--measure-only");
const ONLY = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
const LOOP_S = 12;
const POSTER_T = 3;
/** Keep each phone/wide file at or under this size. */
const MAX_KB = 450;

const VARIANTS = {
  wide: { width: 1280, height: 1024, crf264: 33, crfVp9: 51 },
  phone: { width: 960, height: 864, crf264: 31, crfVp9: 48 },
};

const browserPath =
  process.env.CHROME_PATH ||
  (process.platform === "win32"
    ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    : "/usr/bin/chromium");

const kbOf = (f) => Math.round(statSync(f).size / 1024);

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: browserPath,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

async function openCapture(name, v) {
  const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
  page.on("pageerror", (e) => console.error(`[${name}] page error:`, e.message));
  await page.goto(`${base}/?capture=1&variant=${name}`);
  await page.waitForFunction(() => typeof window.__setSceneTime === "function", null, { timeout: 60000 });
  await page
    .waitForFunction(() => window.__heroAssetsReady === true, null, { timeout: 30000 })
    .catch(() => console.warn(`[${name}] asset-ready flag not seen; continuing`));
  await page.evaluate(() => document.fonts.ready);
  return page;
}

/**
 * Projects the billboard's outer frame (artwork + LED strip + bezel, 16.8 ×
 * 5.76 units around the face centre) into the frame, as % of width/height.
 * The board is static, so one timestamp holds for every frame.
 */
async function measure(page) {
  await page.evaluate((t) => window.__setSceneTime(t), POSTER_T);
  return page.evaluate(() => {
    const face = window.__heroScene.getObjectByName("billboard-face");
    const cam = window.__heroCamera;
    face.updateWorldMatrix(true, false);
    const V = face.position.constructor;
    const corners = [
      [-8.4, 2.88],
      [8.4, 2.88],
      [8.4, -2.88],
      [-8.4, -2.88],
    ].map(([x, y]) => {
      const p = new V(x, y, 0).applyMatrix4(face.matrixWorld).project(cam);
      return [+(((p.x + 1) / 2) * 100).toFixed(2), +(((1 - p.y) / 2) * 100).toFixed(2)];
    });
    return corners;
  });
}

const hotspots = {};

for (const [name, v] of Object.entries(VARIANTS)) {
  const render = !MEASURE_ONLY && !ENCODE_ONLY && (!ONLY || ONLY === name);
  const encode = !MEASURE_ONLY && (!ONLY || ONLY === name);
  const frames = join(process.env.FRAMES_DIR || tmpdir(), `hero-frames-${name}`);
  const total = FPS * LOOP_S;

  const page = await openCapture(name, v);
  hotspots[name] = { width: v.width, height: v.height, corners: await measure(page) };
  console.log(`[${name}] billboard corners (%):`, JSON.stringify(hotspots[name].corners));

  if (render) {
    rmSync(frames, { recursive: true, force: true });
    mkdirSync(frames, { recursive: true });
    const stage = page.locator("#capture-stage");
    console.log(`[${name}] rendering ${total} frames…`);
    for (let i = 0; i < total; i += 1) {
      await page.evaluate((t) => window.__setSceneTime(t), i / FPS);
      await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
      await stage.screenshot({ path: join(frames, `f${String(i).padStart(4, "0")}.png`) });
      if (i % 60 === 0) console.log(`[${name}]   ${i}/${total}`);
    }
  }
  await page.close();
  if (!encode) continue;

  const input = join(frames, "f%04d.png");
  const mp4 = join(outDir, `hero-${name}.mp4`);
  const webm = join(outDir, `hero-${name}.webm`);
  const webp = join(outDir, `hero-${name}.webp`);

  // encode, then raise CRF until each file fits the budget
  let crf264 = v.crf264;
  for (;;) {
    execFileSync(ffmpegPath, [
      "-y", "-loglevel", "error", "-framerate", String(FPS), "-i", input,
      "-c:v", "libx264", "-preset", "veryslow", "-crf", String(crf264), "-g", String(total),
      "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-an", mp4,
    ]);
    if (kbOf(mp4) <= MAX_KB || crf264 >= 40) break;
    crf264 += 1;
  }
  let crfVp9 = v.crfVp9;
  for (;;) {
    execFileSync(ffmpegPath, [
      "-y", "-loglevel", "error", "-framerate", String(FPS), "-i", input,
      "-c:v", "libvpx-vp9", "-crf", String(crfVp9), "-b:v", "0", "-g", String(total), "-row-mt", "1",
      "-deadline", "good", "-cpu-used", "2", "-pix_fmt", "yuv420p", "-an", webm,
    ]);
    if (kbOf(webm) <= MAX_KB || crfVp9 >= 58) break;
    crfVp9 += 1;
  }
  const posterFrame = join(frames, `f${String(POSTER_T * FPS).padStart(4, "0")}.png`);
  await sharp(posterFrame).webp({ quality: 72, effort: 6 }).toFile(webp);

  console.log(`[${name}] ${kbOf(mp4)} kB mp4 (crf ${crf264}) · ${kbOf(webm)} kB webm (crf ${crfVp9}) · ${kbOf(webp)} kB poster`);
  console.log(`[${name}] frames kept in ${frames} (${readdirSync(frames).length}) for --encode-only`);
}

await browser.close();

// the billboard's position in each video, for the HTML hotspot + pop layer
const ts = `/**
 * Where the billboard sits in each pre-rendered hero video (generated by
 * scripts/render-hero.mjs — do not edit by hand). The camera is fixed, so the
 * board is in the same place in every frame.
 *
 * corners: the board's outer frame (artwork + LED strip + bezel) as
 * [x%, y%] of the video frame, clockwise from top-left. The overlay in
 * HeroVideo maps a flat billboard onto this quad with a CSS homography.
 */
export type Quad = [[number, number], [number, number], [number, number], [number, number]];

export interface HeroHotspot {
  /** Video frame size in px. */
  width: number;
  height: number;
  corners: Quad;
}

export const heroHotspot: Record<"wide" | "phone", HeroHotspot> = ${JSON.stringify(hotspots, null, 2)
  .replace(/"(\w+)":/g, "$1:")
  .replace(/\[\s+([\d.-]+),\s+([\d.-]+)\s+\]/g, "[$1, $2]")};
`;
writeFileSync(join(root, "src/data/heroHotspot.ts"), ts);
console.log("[hotspot] src/data/heroHotspot.ts written");
