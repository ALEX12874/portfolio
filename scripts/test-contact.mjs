/**
 * Contact-form test (no real email is sent — the endpoint is mocked).
 *
 *   node scripts/test-contact.mjs
 *
 * Builds the site twice (with a placeholder key, and with no key), serves
 * both with `vite preview`, and drives the form in an installed
 * Chromium/Edge via playwright-core (set CHROME_PATH to choose the browser).
 * Cases: success (+91 phone), success:false, HTTP 500 (with retry),
 * timeout, offline, empty key, and field validation. Exits non-zero on failure.
 */
import { resolve, dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { build, preview } from "vite";
import { chromium } from "playwright-core";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cache = join(root, "node_modules/.cache/contact-test");
const browserPath =
  process.env.CHROME_PATH ||
  (process.platform === "win32"
    ? "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe"
    : "/usr/bin/chromium");

async function buildVariant(name, key) {
  const outDir = join(cache, name);
  const prev = process.env.VITE_WEB3FORMS_KEY;
  process.env.VITE_WEB3FORMS_KEY = key;
  await build({ root, logLevel: "error", build: { outDir, emptyOutDir: true } });
  if (prev === undefined) delete process.env.VITE_WEB3FORMS_KEY;
  else process.env.VITE_WEB3FORMS_KEY = prev;
  const server = await preview({ root, logLevel: "error", build: { outDir }, preview: { port: 0, host: "127.0.0.1" } });
  return { server, url: server.resolvedUrls.local[0] };
}

const results = [];
const check = (name, ok, info = "") => {
  results.push({ name, ok });
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${info ? `  — ${info}` : ""}`);
};

async function fillAndSubmit(page, phone = "+91 98765 43210") {
  await page.evaluate(() => document.getElementById("contact")?.scrollIntoView());
  const form = page.locator("#contact form");
  await form.waitFor({ timeout: 15000 });
  await form.locator('input[name="name"]').fill("TEST - ignore");
  await form.locator('input[name="phone"]').fill(phone);
  await form.locator('input[name="email"]').fill("test@example.com");
  await form.locator("textarea").fill("Automated test of the portfolio contact form. Please ignore.");
  await form.locator('button[type="submit"]').click();
}

async function run() {
  console.log("building test variants…");
  const withKey = await buildVariant("with-key", "test-placeholder-key");
  const noKey = await buildVariant("no-key", "");
  const browser = await chromium.launch({ executablePath: browserPath });

  const scenario = async (label, base, setup, expect) => {
    const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
    const page = await ctx.newPage();
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    let posts = 0;
    let lastBody = null;
    await page.route("https://api.web3forms.com/**", async (route) => {
      posts += 1;
      lastBody = route.request().postDataJSON();
      await setup.respond(route, posts);
    });
    await page.goto(base);
    await page.waitForTimeout(800);
    // the footer is a lazy chunk: let it load before cutting the network
    await page.evaluate(() => document.getElementById("contact")?.scrollIntoView());
    await page.locator("#contact form").waitFor({ timeout: 15000 });
    if (setup.offline) await ctx.setOffline(true);
    await fillAndSubmit(page, setup.phone);
    const outcome = await Promise.race([
      page.locator("#contact [role=status]").filter({ hasText: "Thanks" }).waitFor({ timeout: 40000 }).then(() => "success"),
      page.locator("#contact [role=alert]").waitFor({ timeout: 40000 }).then(async () => `error: ${await page.locator("#contact [role=alert]").innerText()}`),
    ]).catch(() => "stuck");
    const spinner = await page.locator("#contact form button[type=submit]").isDisabled().catch(() => false);
    await expect({ outcome, posts, lastBody, errors, spinner, page });
    await ctx.close();
  };

  const json = (body, status = 200) => (route) =>
    route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

  await scenario("success + '+91 98765 43210' accepted", withKey.url, { respond: json({ success: true }) }, async (r) => {
    check("success state shown", r.outcome === "success", r.outcome.slice(0, 80));
    check("payload is Web3Forms JSON", r.lastBody?.botcheck === false && r.lastBody?.replyto === "test@example.com" && /New portfolio enquiry from TEST - ignore/.test(r.lastBody?.subject ?? ""));
    check("no page errors", r.errors.length === 0, r.errors.join("; "));
  });

  await scenario("success:false", withKey.url, { respond: json({ success: false, message: "Invalid access key" }) }, async (r) => {
    check("success:false → error with reason", r.outcome.startsWith("error") && /Invalid access key/.test(r.outcome), r.outcome.slice(0, 120));
    check("fallback buttons present", (await r.page.locator("#contact [role=alert] a[href^='mailto:']").count()) === 1 && (await r.page.getByRole("button", { name: /Copy my message/ }).count()) === 1);
    check("button re-enabled", !r.spinner);
  });

  await scenario("HTTP 500 (retried once)", withKey.url, { respond: json({ message: "Server error" }, 500) }, async (r) => {
    check("500 → error after one retry", r.outcome.startsWith("error") && r.posts === 2, `posts=${r.posts}`);
  });

  await scenario("timeout", withKey.url, { respond: () => new Promise(() => {}) }, async (r) => {
    check("timeout → error (spinner not stuck)", r.outcome.startsWith("error") && /too long/.test(r.outcome) && !r.spinner, r.outcome.slice(0, 80));
  });

  await scenario("offline", withKey.url, { offline: true, respond: json({ success: true }) }, async (r) => {
    check("offline → clear message", r.outcome.startsWith("error") && /offline/i.test(r.outcome), r.outcome.slice(0, 80));
  });

  await scenario("empty key", noKey.url, { respond: json({ success: true }) }, async (r) => {
    check("no key → 'not connected' + mailto fallback", r.outcome.startsWith("error") && /isn't connected/.test(r.outcome) && r.posts === 0, r.outcome.slice(0, 80));
  });

  // validation: bad phone gets an inline error, focus moves to it
  {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await ctx.newPage();
    await page.goto(withKey.url);
    await page.waitForTimeout(800);
    await fillAndSubmit(page, "12ab");
    const err = await page.locator("#contact form [id$='-phone-error']").innerText().catch(() => "");
    const focused = await page.evaluate(() => document.activeElement?.getAttribute("name"));
    check("invalid phone → inline error + focus", err.length > 0 && focused === "phone", err);
    await ctx.close();
  }

  await browser.close();
  withKey.server.httpServer.close();
  noKey.server.httpServer.close();

  const failed = results.filter((r) => !r.ok).length;
  console.log(`\n${results.length - failed}/${results.length} checks passed`);
  process.exit(failed ? 1 : 0);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
