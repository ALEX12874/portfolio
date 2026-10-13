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

export default defineConfig(({ mode }) => {
  // loadEnv reads .env files and also picks up VITE_* vars from the shell /
  // hosting dashboard (e.g. Vercel's Environment Variables)
  const env = loadEnv(mode, ".", "VITE_");
  return {
    plugins: [react(), siteUrl(resolveSiteUrl(env))],
    resolve: {
      // one copy of react / three / fiber, so drei always shares fiber's store
      dedupe: ["react", "react-dom", "three", "@react-three/fiber"],
    },
    optimizeDeps: {
      include: ["three", "@react-three/fiber", "@react-three/drei"],
    },
    build: {
      target: "es2020",
      chunkSizeWarningLimit: 1600,
    },
  };
});
