// Real Me performance probe: ×4 CPU, scroll pass + 10 s idle, trace-based paint/layout counts.
import { chromium } from "playwright-core";
import { writeFileSync } from "node:fs";
const url = process.argv[2];
const outFile = process.argv[3] || "perf-rm.json";
const only = process.env.ONLY ? process.env.ONLY.split(",") : null;
const CONFIGS = [
  ["desktop 1440x900", { viewport: { width: 1440, height: 900 } }],
  ["phone 390x844", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }],
  ["landscape 844x390", { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 3 }],
];
const b = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe" });
const results = [];

const pct = (arr, q) => { const s = [...arr].sort((a, b) => a - b); return s.length ? s[Math.min(s.length - 1, Math.floor(q * s.length))] : 0; };

function analyseTrace(buf, vw, vh) {
  const ev = JSON.parse(buf.toString()).traceEvents || [];
  let paints = 0, paintArea = 0, layouts = 0, styles = 0, layoutMs = 0, paintMs = 0, scriptMs = 0;
  const byNode = {};
  const frames = ev.filter((e) => e.name === "BeginFrame" || e.name === "DrawFrame").length;
  for (const e of ev) {
    if (e.ph === "X" || e.ph === "B") {
      const d = (e.dur || 0) / 1000;
      if (e.name === "Paint") {
        paints++; paintMs += d;
        const nid = e.args?.data?.nodeId; byNode[nid] = (byNode[nid] || 0) + 1;
        const c = e.args?.data?.clip;
        if (c && c.length >= 8) { const xs = [c[0], c[2], c[4], c[6]], ys = [c[1], c[3], c[5], c[7]]; paintArea += (Math.max(...xs) - Math.min(...xs)) * (Math.max(...ys) - Math.min(...ys)); }
      } else if (e.name === "Layout") { layouts++; layoutMs += d; }
      else if (e.name === "UpdateLayoutTree") { styles++; }
      else if (["FunctionCall", "EvaluateScript", "FireAnimationFrame", "TimerFire", "EventDispatch", "RunMicrotasks", "V8.Execute"].includes(e.name)) scriptMs += d;
    }
  }
  void paintArea;
  return { byNode, paints, layouts, styles, layoutMs: Math.round(layoutMs), paintMs: Math.round(paintMs), scriptMsTrace: Math.round(scriptMs), frames };
}

for (const [name, opts] of CONFIGS) {
  if (only && !only.some((o) => name.includes(o))) continue;
  const ctx = await b.newContext(opts);
  const p = await ctx.newPage();
  const logs = [];
  p.on("console", (m) => ["error", "warning"].includes(m.type()) && logs.push(`${m.type()}: ${m.text().slice(0, 200)}`));
  p.on("pageerror", (e) => logs.push("pageerror: " + e.message));
  p.on("requestfailed", (r) => { const f = r.failure()?.errorText || ""; if (!/ABORTED/.test(f)) logs.push(`failed: ${f} ${r.url().slice(0, 100)}`); });
  await p.addInitScript(() => {
    window.__lt = [];
    try { new PerformanceObserver((l) => l.getEntries().forEach((e) => window.__lt.push([Math.round(e.startTime), Math.round(e.duration)]))).observe({ type: "longtask", buffered: true }); } catch {}
  });
  await p.goto(url, { waitUntil: "load" });
  // render every section at real size (lazy sections) before measuring
  for (let i = 0; i < 60; i++) { await p.evaluate(() => window.scrollBy(0, 300)); await p.waitForTimeout(40); }
  await p.evaluate(() => window.scrollTo(0, 0));
  await p.waitForTimeout(1500);
  const cdp = await ctx.newCDPSession(p);
  await cdp.send("Performance.enable");
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 4 });
  const vw = opts.viewport.width, vh = opts.viewport.height;

  // ---- scroll pass: Experience → Real Me → Perspectives and back (time-based)
  const range = await p.evaluate(() => {
    const top = (id) => document.getElementById(id).getBoundingClientRect().top + scrollY;
    return { from: Math.round(top("experience")), to: Math.round(top("perspectives") + 200) };
  });
  await p.evaluate((y) => window.scrollTo(0, y), range.from);
  await p.waitForTimeout(1200);
  const m0 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  await b.startTracing(p, { categories: ["devtools.timeline", "disabled-by-default-devtools.timeline.frame"] });
  const ltStart = await p.evaluate(() => performance.now());
  const scroll = await p.evaluate(async ({ from, to }) => {
    const dts = [];
    const run = (a, z, ms) => new Promise((res) => {
      const t0 = performance.now(); let last = t0;
      const step = (t) => {
        dts.push(t - last); last = t;
        const k = Math.min(1, (t - t0) / ms);
        window.scrollTo(0, a + (z - a) * k);
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
    await run(from, to, 5000);
    await run(to, from, 5000);
    return dts.slice(2);
  }, range);
  const traceScroll = analyseTrace(await b.stopTracing(), vw, vh);
  const m1 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  const ltScroll = (await p.evaluate((s) => window.__lt.filter(([t]) => t >= s), ltStart));
  const fpsScroll = scroll.map((d) => 1000 / d);

  // ---- idle 10 s on Real Me
  await p.evaluate(() => document.getElementById("real-me").scrollIntoView({ behavior: "instant" }));
  await p.waitForTimeout(3000);
  const nodes = await p.evaluate(() => { const s = document.getElementById("real-me"); return { all: s.querySelectorAll("*").length, svg: s.querySelectorAll("svg *").length, paths: s.querySelectorAll("path").length }; });
  const i0 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  await b.startTracing(p, { categories: ["devtools.timeline", "disabled-by-default-devtools.timeline.frame"] });
  const ltIdleStart = await p.evaluate(() => performance.now());
  const idle = await p.evaluate(() => new Promise((res) => {
    const dts = []; let last = performance.now(); const t0 = last;
    const step = (t) => { dts.push(t - last); last = t; if (t - t0 < 10000) requestAnimationFrame(step); else res(dts.slice(2)); };
    requestAnimationFrame(step);
  }));
  const traceIdle = analyseTrace(await b.stopTracing(), vw, vh);
  const i1 = Object.fromEntries((await cdp.send("Performance.getMetrics")).metrics.map((m) => [m.name, m.value]));
  await cdp.send("DOM.getDocument", { depth: -1 });
  const repainters = [];
  for (const [nid, n] of Object.entries(traceIdle.byNode).sort((a, b) => b[1] - a[1]).slice(0, 8)) {
    if (n < idle.length * 0.2) continue;
    let desc = "?";
    try { const r = await cdp.send("DOM.resolveNode", { backendNodeId: Number(nid) }); const o = await cdp.send("Runtime.callFunctionOn", { objectId: r.object.objectId, functionDeclaration: "function(){ const e=this.nodeType===1?this:(this.parentElement||document.documentElement); return e===document.documentElement||this.nodeType===9?'document root':(e.tagName.toLowerCase()+'.'+String(e.className?.baseVal ?? e.className).split(' ')[0]) }", returnByValue: true }); desc = o.result.value; } catch {}
    repainters.push(`${desc} ${(n / idle.length).toFixed(2)}/frame`);
  }
  delete traceIdle.byNode; delete traceScroll.byNode;
  const ltIdle = (await p.evaluate((s) => window.__lt.filter(([t]) => t >= s), ltIdleStart));
  const fpsIdle = idle.map((d) => 1000 / d);

  const r = {
    config: name,
    scroll: {
      fpsMedian: Math.round(pct(fpsScroll, 0.5)), fpsP5: Math.round(pct(fpsScroll, 0.05)), fpsMin: Math.round(Math.min(...fpsScroll)),
      frames: scroll.length, longTasks: ltScroll.length, longTaskMaxMs: Math.max(0, ...ltScroll.map(([, d]) => d)),
      layoutCount: m1.LayoutCount - m0.LayoutCount, styleCount: m1.RecalcStyleCount - m0.RecalcStyleCount,
      scriptMs: Math.round((m1.ScriptDuration - m0.ScriptDuration) * 1000), busyPct: Math.round((((m1.TaskDuration - m0.TaskDuration) * 1000) / 10000) * 100), ...traceScroll,
    },
    idle: {
      fpsMedian: Math.round(pct(fpsIdle, 0.5)), fpsP5: Math.round(pct(fpsIdle, 0.05)), frames: idle.length,
      jsMsPerFrame: +(((i1.ScriptDuration - i0.ScriptDuration) * 1000) / idle.length).toFixed(2),
      taskMsPerFrame: +(((i1.TaskDuration - i0.TaskDuration) * 1000) / idle.length).toFixed(2),
      paintsPerFrame: +(traceIdle.paints / idle.length).toFixed(2), paintMsPerFrame: +(traceIdle.paintMs / idle.length).toFixed(2),
      layoutMsPerFrame: +(traceIdle.layoutMs / idle.length).toFixed(2), busyPct: Math.round((((i1.TaskDuration - i0.TaskDuration) * 1000) / 10000) * 100), repainters,
      layoutsPerFrame: +((i1.LayoutCount - i0.LayoutCount) / idle.length).toFixed(2),
      longTasks: ltIdle.length, ...Object.fromEntries(Object.entries(traceIdle).map(([k, v]) => ["t_" + k, v])),
    },
    nodes,
    console: logs,
  };
  results.push(r);
  console.log(JSON.stringify(r));
  await cdp.send("Emulation.setCPUThrottlingRate", { rate: 1 });
  await ctx.close();
}
writeFileSync(outFile, JSON.stringify(results, null, 1));
await b.close();
