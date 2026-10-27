import { readFileSync, writeFileSync } from "node:fs";
import { expect, test, type Page } from "@playwright/test";

/**
 * LIVE delivery check — sends 10 real enquiries through the deployed site and
 * confirms each one with Resend's API (last_event = "delivered").
 *
 *   npm run test:live            (LIVE_URL=https://gouranglokwani.vercel.app to override)
 *
 * Needs RESEND_API_KEY in .env.local (or the shell); the key is only sent to
 * api.resend.com and never printed. Runs are spaced ~130 s apart so no
 * 10-minute window has more than 5 sends (the endpoint's per-IP limit).
 * Results: perf/contact-10-runs.md
 */
const BASE = (process.env.LIVE_URL || "https://gouranglokwani.in").replace(/\/$/, "");
const INBOX = "gouranglokwani27@gmail.com";
const SPACING_MS = Number(process.env.LIVE_SPACING_MS || 130_000);

function resendKey(): string {
  if (process.env.RESEND_API_KEY) return process.env.RESEND_API_KEY.trim();
  try {
    const line = readFileSync(".env.local", "utf8")
      .split(/\r?\n/)
      .find((l) => l.startsWith("RESEND_API_KEY="));
    return (line?.slice("RESEND_API_KEY=".length) ?? "").trim().replace(/^["']|["']$/g, "");
  } catch {
    return "";
  }
}

const RUNS = [
  { viewport: "1440×900", phone: "+91 98765 43210", message: "Live delivery test from a desktop browser. Please ignore." },
  { viewport: "1440×900", phone: "098765 43210", message: "Second desktop run, with a leading-zero phone number." },
  { viewport: "1440×900", phone: "9876543210", message: "Third desktop run: ten digits, no spaces at all." },
  { viewport: "1440×900", phone: "(0141) 234-5678", message: "Fourth desktop run: landline with brackets and a dash." },
  { viewport: "1440×900", phone: "+91-98765-43210", message: "Fifth desktop run.\nThis message has two lines." },
  { viewport: "390×844 phone", phone: "+91 98765 43210", message: "First phone run (390×844). Please ignore this test." },
  { viewport: "390×844 phone", phone: "098765 43210", message: "Second phone run, leading-zero format." },
  { viewport: "390×844 phone", phone: "9876543210", message: "Third phone run: plain ten digits." },
  { viewport: "390×844 phone", phone: "+44 20 7946 0958", message: "Fourth phone run with an international (UK) number." },
  { viewport: "390×844 phone", phone: "98765.43210", message: "Fifth phone run: dotted number, final test of ten." },
];

interface Row {
  run: number;
  viewport: string;
  status: number | string;
  id: string;
  ui: string;
  delivery: string;
  seconds: string;
}

async function submit(page: Page, n: number, phone: string, message: string) {
  await page.goto(BASE, { waitUntil: "load" });
  await page.evaluate(() => window.sessionStorage.clear());
  // render the lazy sections, then go to the form
  for (let i = 0; i < 30; i += 1) {
    await page.evaluate(() => window.scrollBy(0, 600));
    await page.waitForTimeout(60);
  }
  await page.evaluate(() => document.getElementById("contact")?.scrollIntoView({ behavior: "instant" }));
  const form = page.locator("#contact form");
  await expect(form).toBeVisible({ timeout: 30_000 });
  await form.locator('input[name="name"]').fill(`TEST ${n}/10 - please ignore`);
  await form.locator('input[name="phone"]').fill(phone);
  await form.locator('input[name="email"]').fill(INBOX);
  await form.locator("textarea").fill(message);
  const response = page.waitForResponse((r) => r.url().endsWith("/api/contact") && r.request().method() === "POST", {
    timeout: 45_000,
  });
  await form.locator('button[type="submit"]').click();
  return response;
}

async function deliveryStatus(id: string, key: string): Promise<string> {
  const until = Date.now() + 60_000;
  let last = "unknown";
  while (Date.now() < until) {
    const res = await fetch(`https://api.resend.com/emails/${encodeURIComponent(id)}`, {
      headers: { Authorization: `Bearer ${key}` },
    });
    if (res.ok) {
      const data = (await res.json()) as { last_event?: string };
      last = data.last_event ?? "unknown";
      if (last === "delivered") return last;
      if (["bounced", "complained", "failed"].includes(last)) return last;
    } else {
      last = `lookup HTTP ${res.status}`;
    }
    await new Promise((r) => setTimeout(r, 4000));
  }
  return last;
}

function writeReport(rows: Row[]) {
  const ok = rows.filter((r) => r.ui === "success" && r.delivery === "delivered").length;
  const lines = [
    "# Contact form — 10 live runs",
    "",
    `Site: ${BASE} · inbox: ${INBOX} · run on ${new Date().toISOString()}`,
    "Each run fills the live form, waits for the success message, takes the email id returned by",
    "`/api/contact`, and polls Resend's API (`GET /emails/{id}`) until `last_event` is `delivered` (60 s max).",
    "",
    "| Run | Viewport | HTTP | Email id | UI | Delivery | Time to delivered |",
    "| --- | --- | --- | --- | --- | --- | --- |",
    ...rows.map((r) => `| ${r.run}/10 | ${r.viewport} | ${r.status} | \`${r.id}\` | ${r.ui} | ${r.delivery} | ${r.seconds} |`),
    "",
    `**Result: ${ok}/${rows.length} delivered.**`,
    "",
  ];
  writeFileSync("perf/contact-10-runs.md", lines.join("\n"));
}

test.describe.configure({ mode: "serial" });

test("10 live submissions are delivered to the inbox", async ({ browser }) => {
  const key = resendKey();
  test.skip(!key, "RESEND_API_KEY is not set (.env.local) — can't confirm delivery");
  test.setTimeout(RUNS.length * (SPACING_MS + 120_000));

  const rows: Row[] = [];
  for (let i = 0; i < RUNS.length; i += 1) {
    const n = i + 1;
    const spec = RUNS[i];
    if (i > 0) await new Promise((r) => setTimeout(r, SPACING_MS));
    const phoneView = spec.viewport.includes("phone");
    const ctx = await browser.newContext(
      phoneView
        ? { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true }
        : { viewport: { width: 1440, height: 900 } }
    );
    const page = await ctx.newPage();
    const row: Row = { run: n, viewport: spec.viewport, status: "-", id: "-", ui: "-", delivery: "-", seconds: "-" };
    const started = Date.now();
    try {
      const res = await submit(page, n, spec.phone, spec.message);
      row.status = res.status();
      const body = (await res.json().catch(() => ({}))) as { id?: string; ok?: boolean; error?: string };
      row.id = body.id ?? `(none: ${body.error ?? "no id"})`;
      const success = page.locator("#contact [role=status]").filter({ hasText: "your message is on its way" });
      row.ui = (await success.isVisible({ timeout: 20_000 }).catch(() => false))
        ? "success"
        : (await success.waitFor({ timeout: 15_000 }).then(() => true).catch(() => false))
          ? "success"
          : "no success message";
      if (body.id) {
        row.delivery = await deliveryStatus(body.id, key);
        row.seconds = `${((Date.now() - started) / 1000).toFixed(1)} s`;
      }
    } catch (err) {
      row.ui = `error: ${String((err as Error).message).split("\n")[0].slice(0, 80)}`;
    }
    rows.push(row);
    writeReport(rows);
    console.log(`run ${n}/10 ${row.viewport}: HTTP ${row.status}, UI ${row.ui}, delivery ${row.delivery}`);
    await ctx.close();
  }

  const failed = rows.filter((r) => r.ui !== "success" || r.delivery !== "delivered");
  expect(failed, JSON.stringify(failed, null, 1)).toEqual([]);
});
