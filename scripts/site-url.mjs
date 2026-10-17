/**
 * The single source of the public site URL: VITE_SITE_URL, else the default
 * Vercel domain. Used by index.html (canonical, og:url, JSON-LD) via the
 * Vite plugin and by scripts/generate-seo.mjs (sitemap, robots).
 */
export const DEFAULT_SITE_URL = "https://gouranglokwani.in";

/** @param {Record<string, string | undefined>} env */
export function resolveSiteUrl(env) {
  const raw = (env.VITE_SITE_URL || "").trim() || DEFAULT_SITE_URL;
  return raw.replace(/\/+$/, "");
}
