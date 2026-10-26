// First-load probe: Slow 4G + CPU ×4 (or desktop), 6 s trace with screenshots,
// long tasks attributed to scripts, bytes before FCP / load, console + failures.
import { chromium } from "playwright-core";
import { writeFileSync, mkdirSync } from "node:fs";

const url = process.argv[2];
const tag = process.argv[3] || "run";
const profile = process.argv[4] || "mobile"; // mobile | desktop
mkdirSync(`fl/${tag}`, { recursive: true });

const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const ctxOpts =
  profile === "mobile"
    ? { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true, userAgent: "Mozilla/5.0 (Linux; Android 11; moto g power (2022)) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/155.0.0.0 Mobile Safari/537.36" }
    : { viewport: { width: 1350, height: 940 } };
const ctx = await b.newContext(ctxOpts);
const p = await ctx.newPage();
const cdp = await ctx.newCDPSession(p);
await cdp.send("Network.enable");
await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
if (profile === "mobile") {
  // Lighthouse "Slow 4G" (applied): 562.5 ms RTT, ~1.47 Mbps down, ~0.68 Mbps up; CPU ×4
  await cdp.send("Network.emulateNetworkConditions", { offline: false, latency: 562.5, downloadThroughput: (1474.56 * 1024) / 8, uploadThroughput: (675 * 1024) / 8 });
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
}
const logs = [];
p.on("console", (m) => ["error", "warning"].includes(m.type()) && logs.push(`${m.type()}: ${m.text().slice(0, 200)}`));
p.on("pageerror", (e) => logs.push("pageerror: " + e.message));
p.on("requestfailed", (r) => { const f = r.failure()?.errorText || ""; if (!/ABORTED/.test(f)) logs.push(`failed: ${f} ${r.url().slice(0, 100)}`); });

// network accounting
const reqs = new Map();
let t0 = 0;
cdp.on("Network.requestWillBeSent", (e) => { if (!t0) t0 = e.timestamp; reqs.set(e.requestId, { url: e.request.url, start: e.timestamp, type: e.type }); });
cdp.on("Network.responseReceived", (e) => { const r = reqs.get(e.requestId); if (r) { r.status = e.response.status; r.mime = e.response.mimeType; r.enc = e.response.headers["content-encoding"] || e.response.headers["Content-Encoding"] || ""; } });
cdp.on("Network.loadingFinished", (e) => { const r = reqs.get(e.requestId); if (r) { r.end = e.timestamp; r.bytes = e.encodedDataLength; } });

await p.addInitScript(() => {
  window.__lt = [];
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: "longtask", buffered: true }); } catch {}
  window.__cls = 0;
  try { new PerformanceObserver((l) => l.getEntries().forEach((e) => { if (!e.hadRecentInput) window.__cls += e.value; })).observe({ type: "layout-shift", buffered: true }); } catch {}
  window.__lcp = 0;
  try { new PerformanceObserver((l) => { const es = l.getEntries(); window.__lcp = es[es.length - 1].startTime; window.__lcpEl = es[es.length - 1].element?.tagName + "." + String(es[es.length - 1].element?.className || "").slice(0, 40); }).observe({ type: "largest-contentful-paint", buffered: true }); } catch {}
});

await b.startTracing(p, { screenshots: true, categories: ["devtools.timeline", "disabled-by-default-devtools.timeline", "disabled-by-default-devtools.screenshot", "v8.execute", "blink.user_timing"] });
await p.goto(url, { waitUntil: "commit" });
await p.waitForTimeout(profile === "mobile" ? 9000 : 6500);
const trace = JSON.parse((await b.stopTracing()).toString()).traceEvents;

const perf = await p.evaluate(() => {
  const nav = performance.getEntriesByType("navigation")[0];
  const fcp = performance.getEntriesByName("first-contentful-paint")[0]?.startTime ?? null;
  return { fcp, lcp: window.__lcp, lcpEl: window.__lcpEl, cls: window.__cls, load: nav?.loadEventEnd, dcl: nav?.domContentLoadedEventEnd, lt: window.__lt };
});

// ---- trace: navigation start, long tasks with attribution, screenshots
const navStart = trace.find((e) => e.name === "navigationStart" && e.args?.data?.isLoadingMainFrame)?.ts ?? trace.find((e) => e.name === "navigationStart")?.ts ?? trace[0].ts;
const mainPid = trace.find((e) => e.name === "navigationStart")?.pid;
const mainTid = trace.find((e) => e.name === "navigationStart")?.tid;
const tasks = trace.filter((e) => e.name === "RunTask" && e.pid === mainPid && e.tid === mainTid && e.dur > 50000 && e.ts - navStart < 6_000_000);
const kids = trace.filter((e) => e.pid === mainPid && e.tid === mainTid && e.ph === "X" && e.dur);
const short = (u) => (u || "").replace(/^https?:\/\/[^/]+/, "").replace(/\?.*$/, "").slice(0, 60) || "(page)";
const longTasks = tasks.map((t) => {
  const inside = kids.filter((k) => k.ts >= t.ts && k.ts + k.dur <= t.ts + t.dur && k !== t);
  const by = {};
  for (const k of inside) {
    const d = k.args?.data || {};
    let key = null;
    if (k.name === "EvaluateScript" || k.name === "v8.compile" || k.name === "v8.compileModule") key = "eval " + short(d.url || k.args?.fileName);
    else if (k.name === "FunctionCall") key = "js " + short(d.url) + (d.functionName ? ` (${d.functionName})` : "");
    else if (k.name === "Layout") key = "layout";
    else if (k.name === "UpdateLayoutTree") key = "style recalc";
    else if (k.name === "Paint" || k.name === "PrePaint") key = "paint";
    else if (k.name === "ParseHTML") key = "parse html";
    else if (k.name === "Decode Image" || k.name === "ImageDecodeTask") key = "image decode";
    else if (k.name === "GPUTask" || k.name === "WebGL") key = "webgl";
    if (key) by[key] = (by[key] || 0) + k.dur / 1000;
  }
  const top = Object.entries(by).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([k, v]) => `${k} ${Math.round(v)}ms`).join("; ");
  return { at: Math.round((t.ts - navStart) / 1000), ms: Math.round(t.dur / 1000), top };
});
const shots = trace.filter((e) => e.name === "Screenshot" && e.args?.snapshot).map((e) => ({ t: (e.ts - navStart) / 1000, img: e.args.snapshot }));
const strip = [];
for (let t = 0; t <= 6000; t += 250) {
  const s = [...shots].reverse().find((x) => x.t <= t);
  strip.push({ t, img: s?.img ?? null });
}
// film strip contact sheet
const cell = profile === "mobile" ? { w: 103, h: 206 } : { w: 216, h: 150 };
const html = `<html><body style="margin:0;background:#222;font:11px sans-serif;color:#eee;display:flex;flex-wrap:wrap;width:${(cell.w + 6) * 13}px">${strip
  .map((s) => `<div style="margin:3px;width:${cell.w}px"><div style="height:${cell.h}px;background:#000">${s.img ? `<img src="data:image/jpeg;base64,${s.img}" style="width:${cell.w}px;height:${cell.h}px;object-fit:cover;object-position:top">` : ""}</div><div>${(s.t / 1000).toFixed(2)} s</div></div>`)
  .join("")}</body></html>`;
const sheet = await ctx.newPage();
await sheet.setViewportSize({ width: (cell.w + 6) * 13, height: 800 });
await sheet.setContent(html);
await sheet.waitForTimeout(300);
await sheet.screenshot({ path: `fl/${tag}/filmstrip.png`, fullPage: true });

// network totals
const rel = (ts) => (ts - t0) * 1000;
const all = [...reqs.values()].filter((r) => r.bytes != null && !r.url.startsWith("data:"));
const fcpT = perf.fcp ?? 0;
const before = (ms) => all.filter((r) => rel(r.end) <= ms);
const sum = (rs) => Math.round(rs.reduce((a, r) => a + r.bytes, 0) / 1024);
const loadT = perf.load ?? 0;
const js = all.filter((r) => /\.js(\?|$)/.test(r.url));
const result = {
  url, tag, profile,
  fcp: Math.round(perf.fcp ?? -1), lcp: Math.round(perf.lcp), lcpEl: perf.lcpEl, cls: +perf.cls.toFixed(4), dcl: Math.round(perf.dcl ?? -1), load: Math.round(loadT),
  bytesBeforeFCP_kB: sum(before(fcpT)), reqsBeforeFCP: before(fcpT).length,
  bytesBeforeLoad_kB: sum(before(loadT)), reqsBeforeLoad: before(loadT).length,
  bytes6s_kB: sum(all), reqs6s: all.length,
  jsLoaded: js.map((r) => `${short(r.url)} ${Math.round(r.bytes / 1024)}kB @${Math.round(rel(r.start))}ms ${r.enc}`),
  longTasks, longTaskCount: longTasks.length, worstTaskMs: Math.max(0, ...longTasks.map((t) => t.ms)),
  console: logs,
};
writeFileSync(`fl/${tag}/result.json`, JSON.stringify(result, null, 1));
console.log(JSON.stringify(result, null, 1));
await b.close();
