/**
 * Writes public/sitemap.xml and public/robots.txt from the site URL.
 * Runs automatically before every build ("prebuild" in package.json).
 */
import { writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { loadEnv } from "vite";
import { resolveSiteUrl } from "./site-url.mjs";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const mode = process.env.NODE_ENV === "development" ? "development" : "production";
const env = loadEnv(mode, root, "VITE_");
const site = resolveSiteUrl(env);
const today = new Date().toISOString().slice(0, 10);

const sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>${site}/</loc>
    <lastmod>${today}</lastmod>
    <changefreq>monthly</changefreq>
    <priority>1.0</priority>
  </url>
</urlset>
`;

const robots = `User-agent: *
Allow: /

Sitemap: ${site}/sitemap.xml
`;

writeFileSync(resolve(root, "public/sitemap.xml"), sitemap);
writeFileSync(resolve(root, "public/robots.txt"), robots);
console.log(`[seo] sitemap.xml + robots.txt written for ${site}`);
