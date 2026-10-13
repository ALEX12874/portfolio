/**
 * Renders the live 3D hero into seamless 12 s video loops + posters.
 *
 *   npm run build && npm run preview          # serves http://localhost:4173
 *   node scripts/render-hero.mjs [baseUrl]    # default http://127.0.0.1:4173
 *
 * Uses an installed Chromium/Edge through playwright-core (no browser
 * download). Set CHROME_PATH to pick the browser. Outputs to src/assets/hero/:
 *   hero-wide.{mp4,webm,webp}   1280×1024 source
 *   hero-phone.{mp4,webm,webp}  960×864 source
 * Re-run only when the scene changes.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, rmSync, statSync } from "node:fs";
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
// `--encode-only`: reuse frames kept by an earlier run (FRAMES_DIR)
const ENCODE_ONLY = process.argv.includes("--encode-only");
const LOOP_S = 12;
const POSTER_T = 3;

const VARIANTS = {
  wide: { width: 1280, height: 1024, crf264: 33, crfVp9: 51 },
  phone: { width: 960, height: 864, crf264: 30, crfVp9: 46 },
};

const browserPath =
  process.env.CHROME_PATH ||
  (process.platform === "win32"
    ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    : "/usr/bin/chromium");

const kb = (f) => `${Math.round(statSync(f).size / 1024)} kB`;

mkdirSync(outDir, { recursive: true });
const browser = await chromium.launch({
  executablePath: browserPath,
  args: ["--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
});

for (const [name, v] of Object.entries(VARIANTS)) {
  const frames = join(process.env.FRAMES_DIR || tmpdir(), `hero-frames-${name}`);
  const total = FPS * LOOP_S;
  if (!ENCODE_ONLY) {
  rmSync(frames, { recursive: true, force: true });
  mkdirSync(frames, { recursive: true });

  const page = await browser.newPage({ viewport: { width: v.width, height: v.height } });
  page.on("pageerror", (e) => console.error(`[${name}] page error:`, e.message));
  await page.goto(`${base}/?capture=1&variant=${name}`);
  await page.waitForFunction(() => typeof window.__setSceneTime === "function", null, { timeout: 60000 });
  await page
    .waitForFunction(() => window.__heroAssetsReady === true, null, { timeout: 30000 })
    .catch(() => console.warn(`[${name}] asset-ready flag not seen; continuing`));
  await page.evaluate(() => document.fonts.ready);
  const stage = page.locator("#capture-stage");

  console.log(`[${name}] rendering ${total} frames…`);
  for (let i = 0; i < total; i += 1) {
    await page.evaluate((t) => window.__setSceneTime(t), i / FPS);
    await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => r())));
    await stage.screenshot({
      path: join(frames, `f${String(i).padStart(4, "0")}.png`),
    });
    if (i % 60 === 0) console.log(`[${name}]   ${i}/${total}`);
  }
  await page.close();
  }

  const input = join(frames, "f%04d.png");
  const mp4 = join(outDir, `hero-${name}.mp4`);
  const webm = join(outDir, `hero-${name}.webm`);
  const webp = join(outDir, `hero-${name}.webp`);

  execFileSync(ffmpegPath, [
    "-y", "-loglevel", "error", "-framerate", String(FPS), "-i", input,
    "-c:v", "libx264", "-preset", "veryslow", "-crf", String(v.crf264), "-g", String(total),
    "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", "-an", mp4,
  ]);
  execFileSync(ffmpegPath, [
    "-y", "-loglevel", "error", "-framerate", String(FPS), "-i", input,
    "-c:v", "libvpx-vp9", "-crf", String(v.crfVp9), "-b:v", "0", "-g", String(total), "-row-mt", "1",
    "-deadline", "good", "-cpu-used", "2", "-pix_fmt", "yuv420p", "-an", webm,
  ]);
  const posterFrame = join(frames, `f${String(POSTER_T * FPS).padStart(4, "0")}.png`);
  await sharp(posterFrame).webp({ quality: 72, effort: 6 }).toFile(webp);

  console.log(`[${name}] ${kb(mp4)} mp4 · ${kb(webm)} webm · ${kb(webp)} poster`);
  console.log(`[${name}] frames kept in ${frames} (${readdirSync(frames).length}) for --encode-only`);
}

await browser.close();
