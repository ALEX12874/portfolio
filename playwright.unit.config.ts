import { defineConfig } from "@playwright/test";

/** Unit tests (no browser, no web server): npm run test:unit */
export default defineConfig({
  testDir: "tests/unit",
  timeout: 30_000,
  fullyParallel: true,
  reporter: [["list"]],
});
