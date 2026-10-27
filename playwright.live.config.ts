import { existsSync } from "node:fs";
import { defineConfig } from "@playwright/test";

/**
 * Live delivery check against the deployed site (sends real emails):
 *   npm run test:live
 * Not part of `npm run check`.
 */
const candidates =
  process.platform === "win32"
    ? ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"]
    : ["/usr/bin/chromium", "/usr/bin/google-chrome"];
const browserPath = process.env.CHROME_PATH || candidates.find((p) => existsSync(p)) || candidates[0];

export default defineConfig({
  testDir: "tests/live",
  timeout: 45 * 60_000,
  workers: 1,
  reporter: [["list"]],
  use: { launchOptions: { executablePath: browserPath } },
});
