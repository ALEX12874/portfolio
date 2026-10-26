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
  // BASE_PATH is set by the GitHub Pages workflow ("/" or "/repo-name/")
  const base = loadEnv(mode, ".", "BASE_PATH").BASE_PATH || "/";
  return {
    base,
    plugins: [react(), siteUrl(resolveSiteUrl(env))],
    resolve: {
      // one copy of react / three / fiber, so drei always shares fiber's store
      dedupe: ["react", "react-dom", "three", "@react-three/fiber"],
    },
    // no console noise / debugger statements in production bundles
    esbuild: mode === "production" ? { drop: ["console", "debugger"] } : undefined,
    // the build-time first-screen render (npm run build:shell) bundles its
    // dependencies, so Node never has to load a package's raw ESM
    ssr: { noExternal: true },
    optimizeDeps: {
      include: ["three", "@react-three/fiber", "@react-three/drei"],
    },
    build: {
      target: "es2020",
      chunkSizeWarningLimit: 1600,
      rollupOptions: {
        output: {
          // vendor chunks: React + framer-motion load with the shell; three
          // and fiber are separate chunks that only lazy code imports (loaded
          // in idle-time steps, lib/load3d); drei members and pdf.js stay in
          // their own lazy chunks
          manualChunks(id) {
            if (!id.includes("node_modules")) return undefined;
            if (/[\/]node_modules[\/](react|react-dom|scheduler)[\/]/.test(id)) return "react";
            if (/[\/]node_modules[\/](framer-motion|motion-dom|motion-utils)[\/]/.test(id)) return "motion";
            if (/[\/]node_modules[\/]three[\/]/.test(id)) return "three";
            if (/[\/]node_modules[\/](@react-three[\/]fiber|react-reconciler|zustand|its-fine|suspend-react)[\/]/.test(id)) return "r3f";
            return undefined;
          },
        },
      },
    },
  };
});
