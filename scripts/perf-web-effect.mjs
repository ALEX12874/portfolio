// Venom goo (footer "Whisper to me") performance probe.
//   node scripts/perf-web-effect.mjs http://localhost:4173/ [out.json]
//   BASELINE=1 node scripts/perf-web-effect.mjs …   (same run, effect off)
// Drives the mouse in a circle around the button for 10 s, at normal speed and
// with 4× CPU throttling, and reports frame times, the effect's JS time per
// frame, input-to-draw latency, long tasks and (from a devtools.timeline
// trace) layout / style recalculation counts during the run.
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";

const url = process.argv[2] || "http://localhost:4173/";
const outFile = process.argv[3] || "perf-web.json";
const RUN_MS = 10_000;
const b = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  args: ["--use-angle=d3d11", "--enable-gpu", "--ignore-gpu-blocklist"],
});
const pct = (arr, q) => {
  const s = [...arr].sort((x, y) => x - y);
  return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0;
};
const round = (n) => Math.round(n * 100) / 100;
const results = [];

for (const throttle of [1, 4]) {
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  // BASELINE=1: the same run with the effect switched off (as on a touch screen)
  if (process.env.BASELINE) {
    await p.addInitScript(() => {
      const mm = window.matchMedia.bind(window);
      window.matchMedia = (q) => (q.includes("pointer: fine") ? { ...mm(q), matches: false } : mm(q));
    });
  }
  await p.addInitScript(() => {
    window.__whisperWebStats = { js: [], lat: [] };
    window.__long = [];
    new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__long.push(e.duration))).observe({ type: "longtask" });
  });
  await p.goto(url, { waitUntil: "load" });
  await p.evaluate(() => document.getElementById("contact").scrollIntoView({ behavior: "instant" }));
  const pill = p.locator("#contact .whisper");
  await pill.scrollIntoViewIfNeeded();
  await p.waitForTimeout(2500);
  const box = await pill.boundingBox();
  const cx = box.x + box.width / 2;
  const cy = box.y + box.height / 2;
  const cdp = await ctx.newCDPSession(p);
  if (throttle > 1) await cdp.send("Emulation.setCPUThrottlingRate", { rate: throttle });
  await p.mouse.move(cx + box.width / 2 + 70, cy);
  await p.waitForTimeout(300);
  await p.evaluate(() => {
    window.__whisperWebStats.js.length = 0;
    window.__whisperWebStats.lat.length = 0;
    window.__long.length = 0;
    window.__frames = [];
    let prev = 0;
    const tick = (t) => {
      if (prev) window.__frames.push(t - prev);
      prev = t;
      if (!window.__stopFrames) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  });
  await b.startTracing(p, { categories: ["devtools.timeline"] });
  const rx = box.width / 2 + 70;
  const ry = box.height / 2 + 60;
  const t0 = Date.now();
  while (Date.now() - t0 < RUN_MS) {
    const a = ((Date.now() - t0) / 1000) * Math.PI; // one lap per 2 s
    await cdp.send("Input.dispatchMouseEvent", { type: "mouseMoved", x: cx + Math.cos(a) * rx, y: cy + Math.sin(a) * ry });
    await new Promise((r) => setTimeout(r, 8));
  }
  const trace = await b.stopTracing();
  const s = await p.evaluate(() => {
    window.__stopFrames = true;
    return { js: window.__whisperWebStats.js, lat: window.__whisperWebStats.lat, long: window.__long, frames: window.__frames };
  });
  const ev = JSON.parse(trace.toString()).traceEvents || [];
  const count = (name) => ev.filter((e) => e.name === name && (e.ph === "X" || e.ph === "B")).length;
  const refresh = pct(s.frames, 0.5);
  const dropped = s.frames.filter((f) => f > refresh * 1.5).length;
  const fps = s.frames.length / (s.frames.reduce((x, y) => x + y, 0) / 1000);
  results.push({
    run: `${throttle === 1 ? "normal" : "4× CPU throttle"}${process.env.BASELINE ? " (effect off)" : ""}`,
    frames: s.frames.length,
    fps: round(fps),
    frameMedian: round(pct(s.frames, 0.5)),
    frameP95: round(pct(s.frames, 0.95)),
    frameP99: round(pct(s.frames, 0.99)),
    droppedFrames: dropped,
    jsMedian: round(pct(s.js, 0.5)),
    jsP95: round(pct(s.js, 0.95)),
    jsP99: round(pct(s.js, 0.99)),
    jsMax: round(Math.max(0, ...s.js)),
    latMedian: round(pct(s.lat, 0.5)),
    latP95: round(pct(s.lat, 0.95)),
    latP99: round(pct(s.lat, 0.99)),
    longTasks: s.long.length,
    layouts: count("Layout"),
    styleRecalcs: count("UpdateLayoutTree"),
    errors,
  });
  console.log(JSON.stringify(results[results.length - 1]));
  await ctx.close();
}
await b.close();
writeFileSync(outFile, JSON.stringify(results, null, 2));
