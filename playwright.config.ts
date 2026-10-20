import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

/**
 * Contact-form tests (network fully mocked — nothing is ever sent).
 *   npx playwright test        (or: npm run test:contact)
 * Uses an installed Chromium/Edge (no browser download): set CHROME_PATH to
 * choose one. The web server builds the site with a placeholder Web3Forms
 * key, so the backup path can be exercised too.
 */
const candidates =
  process.platform === "win32"
    ? [
        "C:/Program Files/Google/Chrome/Application/chrome.exe",
        "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
      ]
    : ["/usr/bin/chromium", "/usr/bin/google-chrome"];
const browserPath = process.env.CHROME_PATH || candidates.find((p) => existsSync(p)) || candidates[0];

const out = "node_modules/.cache/contact-test";
const vite = `"${process.execPath}" node_modules/vite/bin/vite.js`;

export default defineConfig({
  testDir: "tests",
  timeout: 90_000,
  fullyParallel: true,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4321",
    launchOptions: { executablePath: browserPath },
  },
  webServer: {
    command: `${vite} build --outDir ${out} --emptyOutDir && ${vite} preview --outDir ${out} --port 4321 --strictPort --host 127.0.0.1`,
    url: "http://127.0.0.1:4321",
    timeout: 180_000,
    reuseExistingServer: false,
    env: { VITE_WEB3FORMS_KEY: "test-placeholder-key" },
  },
});
