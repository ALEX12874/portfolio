/**
 * Puts the static first screen (top bar + hero, rendered by
 * src/shell/entry-shell.tsx in an SSR build) into the built index.html, so
 * it paints from HTML + CSS alone. React removes it once its own identical
 * hero is on screen (src/lib/shell.ts).
 *
 *   node scripts/prerender-shell.mjs [outDir=dist] [ssrDir=node_modules/.cache/shell-ssr]
 */
import { existsSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";
import Beasties from "beasties";

const outDir = process.argv[2] || "dist";
const ssrDir = process.argv[3] || "node_modules/.cache/shell-ssr";

// the SSR bundle is ESM; under node_modules/ Node would read it as CommonJS
writeFileSync(resolve(ssrDir, "package.json"), JSON.stringify({ type: "module" }));
const { render } = await import(pathToFileURL(resolve(ssrDir, "entry-shell.js")).href);
let shell = render();
// a visual copy only: ids / references would briefly duplicate the live page's
shell = shell.replace(/\s(id|aria-labelledby|aria-controls|aria-describedby|for)="[^"]*"/g, "");

const file = resolve(outDir, "index.html");
const html = readFileSync(file, "utf8");
const root = '<div id="root"></div>';
if (!html.includes(root)) throw new Error(`prerender-shell: ${root} not found in ${file}`);
if (html.includes('id="shell"')) throw new Error("prerender-shell: index.html already has a shell");

const out = html
  .replace(
    "</head>",
    // the copy sits over the page until React's hero is painted underneath
    "    <style>#shell{position:absolute;top:0;left:0;right:0;z-index:95}</style>\n  </head>"
  )
  .replace(
    root,
    // inert + aria-hidden: visual only (the live page carries the semantics);
    // the inline script runs once the stylesheet has loaded = when the
    // copy's CSS animations start
    `<div id="shell" aria-hidden="true" inert>${shell}</div>\n    <script>window.__shellAt=performance.now()</script>\n    ${root}`
  );
// inline only the CSS the first screen uses (it paints without waiting for
// the stylesheet); the full stylesheet then loads without blocking
const base = (process.env.BASE_PATH || "/").replace(/\/?$/, "/");
const beasties = new Beasties({
  path: resolve(outDir),
  publicPath: base,
  preload: "swap",
  inlineFonts: true,
  preloadFonts: false,
  pruneSource: false,
  reduceInlineStyles: false,
  logLevel: "warn",
});
let final = await beasties.process(out);

// every @font-face (Inter, Archivo, the size-matched fallbacks) must be in
// the inline CSS too: the fonts are named through CSS variables, which the
// critical-CSS pass can't follow — without them the hero text would re-wrap
// when the full stylesheet arrives
const cssHref = /href="([^"]+\.css)"/.exec(final)?.[1];
if (cssHref) {
  const css = readFileSync(resolve(outDir, cssHref.replace(base, "")), "utf8");
  const faces = css.match(/@font-face\{[^}]*\}/g) || [];
  const missing = faces.filter((f) => !final.includes(f));
  if (missing.length) final = final.replace("<style>", `<style>${missing.join("")}`);
}
// the hero poster gets the bandwidth first: the app's JavaScript (which the
// static first screen doesn't need) starts downloading once the poster has
// loaded — 2.5 s at the latest — with its chunks fetched in parallel
const mainScript = /<script type="module" crossorigin src="([^"]+)"><\/script>\s*/.exec(final);
if (!mainScript) throw new Error("prerender-shell: app module script not found");
const preloads = [...final.matchAll(/<link rel="modulepreload" crossorigin href="([^"]+)">\s*/g)];
final = final.replace(mainScript[0], "");
preloads.forEach((m) => {
  final = final.replace(m[0], "");
});
// the orbit's chunks (three.js, fiber, the scene) are fetched together once the
// page has loaded; lib/load3d then runs them in steps from the cache, so the
// steps don't each wait for the network
const manifestFile = resolve(outDir, ".vite/manifest.json");
if (!existsSync(manifestFile)) throw new Error("prerender-shell: build manifest not found");
const manifest = JSON.parse(readFileSync(manifestFile, "utf8"));
rmSync(resolve(outDir, ".vite"), { recursive: true, force: true });
const orbitFiles = new Set();
const collect = (key) => {
  const chunk = manifest[key];
  if (!chunk || orbitFiles.has(chunk.file)) return;
  orbitFiles.add(chunk.file);
  (chunk.imports || []).forEach(collect);
};
collect("src/components/skills/SolarSystem.tsx");
if (!orbitFiles.size) throw new Error("prerender-shell: orbit chunk not found in the manifest");
const booted = new Set([mainScript[1], ...preloads.map((m) => m[1])]);
const orbit = [...orbitFiles].map((f) => base + f).filter((h) => !booted.has(h));

const loader =
  '<script>(function(){var d=document,done=0;function pre(h){var l=d.createElement("link");l.rel="modulepreload";l.crossOrigin="";l.href=h;d.head.appendChild(l)}function go(){if(done)return;done=1;' +
  JSON.stringify(preloads.map((m) => m[1])) +
  ".forEach(pre);" +
  'var s=d.createElement("script");s.type="module";s.crossOrigin="";s.src=' +
  JSON.stringify(mainScript[1]) +
  ';d.head.appendChild(s)}var i=d.querySelector("#shell img");if(!i||i.complete)go();else{i.addEventListener("load",go);i.addEventListener("error",go)}setTimeout(go,2500);addEventListener("load",function(){' +
  JSON.stringify(orbit) +
  '.forEach(pre)})})()</script>';
final = final.replace("</body>", `    ${loader}\n  </body>`);

writeFileSync(file, final);
const inlined = (final.match(/<style[^>]*>([\s\S]*?)<\/style>/g) || []).reduce((n, b) => n + b.length, 0);
console.log(
  `prerender-shell: ${Math.round(shell.length / 1024)} kB first-screen HTML + ${Math.round(inlined / 1024)} kB critical CSS → ${file}`
);
