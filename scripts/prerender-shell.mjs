/**
 * Puts the static first screen (top bar + hero, rendered by
 * src/shell/entry-shell.tsx in an SSR build) into the built index.html, so
 * it paints from HTML + CSS alone. React removes it once its own identical
 * hero is on screen (src/lib/shell.ts).
 *
 *   node scripts/prerender-shell.mjs [outDir=dist] [ssrDir=node_modules/.cache/shell-ssr]
 */
import { readFileSync, writeFileSync } from "node:fs";
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
writeFileSync(file, final);
const inlined = (final.match(/<style[^>]*>([\s\S]*?)<\/style>/g) || []).reduce((n, b) => n + b.length, 0);
console.log(
  `prerender-shell: ${Math.round(shell.length / 1024)} kB first-screen HTML + ${Math.round(inlined / 1024)} kB critical CSS → ${file}`
);
