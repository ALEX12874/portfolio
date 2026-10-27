import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import { resolveSiteUrl } from "./scripts/site-url.mjs";
import { MAX_BODY_BYTES, handleContact } from "./server/contact";
import type { Connect } from "vite";

/** Replaces __SITE_URL__ in index.html (canonical, og:url, og:image, JSON-LD). */
function siteUrl(url: string): Plugin {
  return {
    name: "site-url",
    transformIndexHtml: (html) => html.replace(/__SITE_URL__/g, url),
  };
}

/**
 * Serves POST /api/contact in `vite dev` and `vite preview` with the same
 * handler as the Vercel function (api/contact.ts), so the form can be tested
 * end to end locally. Keys are read server-side from .env.local / the shell
 * and never reach the browser bundle.
 */
function contactApi(env: Record<string, string>): Plugin {
  const middleware: Connect.NextHandleFunction = (req, res, next) => {
    if (!req.url || req.url.split("?")[0] !== "/api/contact") return next();
    const chunks: Buffer[] = [];
    let bytes = 0;
    req.on("data", (c: Buffer) => {
      bytes += c.length;
      if (bytes <= MAX_BODY_BYTES) chunks.push(c);
    });
    req.on("end", async () => {
      const fwd = req.headers["x-forwarded-for"];
      const result = await handleContact(
        {
          method: req.method ?? "GET",
          body: bytes > MAX_BODY_BYTES ? "" : Buffer.concat(chunks).toString("utf8"),
          bodyBytes: bytes,
          ip: (Array.isArray(fwd) ? fwd[0] : fwd)?.split(",")[0]?.trim() || req.socket.remoteAddress || "local",
          page: (req.headers.referer as string | undefined) ?? undefined,
        },
        {
          env: { RESEND_API_KEY: env.RESEND_API_KEY, WEB3FORMS_KEY: env.WEB3FORMS_KEY },
          fetch,
          log: (line) => console.log(line),
        }
      );
      res.statusCode = result.status;
      res.setHeader("Content-Type", "application/json; charset=utf-8");
      res.setHeader("Cache-Control", "no-store");
      res.end(JSON.stringify(result.body));
    });
  };
  return {
    name: "contact-api",
    configureServer: (server) => {
      server.middlewares.use(middleware);
    },
    configurePreviewServer: (server) => {
      server.middlewares.use(middleware);
    },
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
    // server-only keys for the local /api/contact (never exposed to the client)
    plugins: [react(), siteUrl(resolveSiteUrl(env)), contactApi({ ...loadEnv(mode, ".", ""), ...process.env } as Record<string, string>)],
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
