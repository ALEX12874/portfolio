import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolveSiteUrl } from "./scripts/site-url.mjs";

/** Replaces __SITE_URL__ in index.html (canonical, og:url, og:image, JSON-LD). */
function siteUrl(url: string): Plugin {
  return {
    name: "site-url",
    transformIndexHtml: (html) => html.replace(/__SITE_URL__/g, url),
  };
}

/** Loud (non-fatal) warning when a build ships without a contact-form key. */
function contactKeyCheck(env: Record<string, string>, command: string): Plugin {
  return {
    name: "contact-key-check",
    buildStart() {
      if (command !== "build") return;
      if (!(env.VITE_WEB3FORMS_KEY || "").trim() && !(env.VITE_FORMSPREE_ID || "").trim()) {
        const bar = "=".repeat(72);
        this.warn(
          `
${bar}
  VITE_WEB3FORMS_KEY is EMPTY - the contact form cannot send in this build.
` +
            `  Visitors will get the "Email me instead" fallback only.
` +
            `  Add it in .env.local (local) or Vercel > Settings > Environment Variables,
` +
            `  then rebuild / redeploy (Vite bakes VITE_* in at build time).
${bar}`
        );
      }
    },
  };
}

export default defineConfig(({ mode, command }) => {
  // loadEnv reads .env files and also picks up VITE_* vars from the shell /
  // hosting dashboard (e.g. Vercel's Environment Variables)
  const env = loadEnv(mode, ".", "VITE_");
  // BASE_PATH is set by the GitHub Pages workflow ("/" or "/repo-name/")
  const base = loadEnv(mode, ".", "BASE_PATH").BASE_PATH || "/";
  return {
    base,
    plugins: [react(), siteUrl(resolveSiteUrl(env)), contactKeyCheck(env, command)],
    resolve: {
      // one copy of react / three / fiber, so drei always shares fiber's store
      dedupe: ["react", "react-dom", "three", "@react-three/fiber"],
    },
    // no console noise / debugger statements in production bundles
    esbuild: mode === "production" ? { drop: ["console", "debugger"] } : undefined,
    optimizeDeps: {
      include: ["three", "@react-three/fiber", "@react-three/drei"],
    },
    build: {
      target: "es2020",
      chunkSizeWarningLimit: 1600,
    },
  };
});
