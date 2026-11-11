import { expect, test, type Page } from "@playwright/test";

/**
 * Footer "Whisper to me": the voice pill replaces the ELSEWHERE row (and its
 * LinkedIn icon).
 * One click plays the clip; a triple-click (mouse, touch or Enter) opens
 * LinkedIn instead; the pill shakes once when the footer arrives. LinkedIn
 * itself is stubbed: nothing leaves the machine.
 */
const LINKEDIN = "https://www.linkedin.com/in/gourang-lokwani-438394297/";

const VIEWPORTS = [
  { name: "desktop 1440×900", viewport: { width: 1440, height: 900 }, mobile: false },
  { name: "phone 390×844", viewport: { width: 390, height: 844 }, mobile: true },
  { name: "small phone 360×740", viewport: { width: 360, height: 740 }, mobile: true },
  { name: "landscape phone 844×390", viewport: { width: 844, height: 390 }, mobile: true },
];

function watch(page: Page): string[] {
  const problems: string[] = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console error: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => {
    const why = r.failure()?.errorText ?? "";
    // media range requests are aborted when a video switches source
    if (/ERR_ABORTED/.test(why)) return;
    problems.push(`request failed: ${why} ${r.url()}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`);
  });
  return problems;
}

/** Open the page and bring the ELSEWHERE row on screen. */
async function toElsewhere(page: Page) {
  await page.context().route(`${LINKEDIN}**`, (r) => r.fulfill({ contentType: "text/html", body: "<title>LinkedIn</title>" }));
  await page.goto("/");
  await page.evaluate(() => document.getElementById("contact")?.scrollIntoView({ behavior: "instant" }));
  const pill = page.locator("#contact .whisper");
  await expect(pill).toBeVisible({ timeout: 20_000 });
  await pill.scrollIntoViewIfNeeded();
  return pill;
}

const audio = (page: Page) =>
  page.evaluate(() => {
    const a = document.querySelector<HTMLAudioElement>("audio[data-voice]");
    return a ? { paused: a.paused, t: a.currentTime } : null;
  });

for (const v of VIEWPORTS) {
  test.describe(v.name, () => {
    test.use({ viewport: v.viewport, isMobile: v.mobile, hasTouch: v.mobile });

    test("the pill replaces the LinkedIn icon; no LinkedIn link left; no overflow", async ({ page }) => {
      const problems = watch(page);
      const pill = await toElsewhere(page);
      // right under the contact details, with no ELSEWHERE label any more
      const row = page.locator("#contact dl + div");
      await expect(row.locator(".whisper")).toHaveCount(1);
      await expect(pill).toHaveText(/Whisper to me/);
      await expect(page.locator("#contact")).not.toContainText(/elsewhere/i);
      await expect(page.locator(`#contact a[href*="linkedin.com/in/gourang"], header a[href*="linkedin.com/in/gourang"]`)).toHaveCount(0);
      // inside its row, nothing spills sideways (measured after the arrival shake)
      const wrap = page.locator("#contact .whisper-wrap");
      await expect(wrap).toHaveAttribute("data-shakes", "1", { timeout: 3000 });
      await expect(wrap).not.toHaveClass(/is-shaking/);
      const [p, r] = [await pill.boundingBox(), await row.boundingBox()];
      expect(p && r && p.x >= r.x && p.x + p.width <= r.x + r.width + 1).toBe(true);
      expect(await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)).toBeLessThanOrEqual(0);
      await page.screenshot({ path: `test-results/whisper-${v.viewport.width}x${v.viewport.height}-idle.png` });
      expect(problems).toEqual([]);
    });

    test("one click plays the clip, then it returns to idle", async ({ page }) => {
      const problems = watch(page);
      const pill = await toElsewhere(page);
      await pill.click();
      await expect(pill).toHaveAttribute("data-state", "playing");
      await expect(pill).toHaveAttribute("aria-pressed", "true");
      await expect.poll(async () => (await audio(page))?.paused).toBe(false);
      await expect.poll(async () => (await audio(page))?.t ?? 0).toBeGreaterThan(0.3);
      await page.screenshot({ path: `test-results/whisper-${v.viewport.width}x${v.viewport.height}-playing.png` });
      await expect(pill).toHaveAttribute("data-state", "idle", { timeout: 6000 });
      expect(problems).toEqual([]);
    });

    test("triple click opens LinkedIn and stops the clip; two slow clicks don't", async ({ page }) => {
      const problems = watch(page);
      const pill = await toElsewhere(page);

      // two clicks more than 600 ms apart: no LinkedIn
      let opened = false;
      page.on("popup", () => {
        opened = true;
      });
      await pill.click();
      await page.waitForTimeout(700);
      await pill.click();
      await page.waitForTimeout(800);
      expect(opened).toBe(false);
      await expect(pill).toHaveAttribute("data-state", "idle", { timeout: 6000 });
      await page.waitForTimeout(700);

      // three quick clicks: a new tab with LinkedIn, the sound stops
      const popup = page.waitForEvent("popup");
      await pill.click({ clickCount: 3 });
      const tab = await popup;
      await tab.waitForURL(`${LINKEDIN}**`);
      expect((await audio(page))?.paused).toBe(true);
      await expect(page.locator(".whisper-toast")).toHaveText("Opening LinkedIn…");
      await tab.close();
      expect(problems).toEqual([]);
    });

    test("three quick Enter presses open LinkedIn", async ({ page }) => {
      const pill = await toElsewhere(page);
      await pill.focus();
      const popup = page.waitForEvent("popup");
      await page.keyboard.press("Enter");
      await page.keyboard.press("Enter");
      await page.keyboard.press("Enter");
      const tab = await popup;
      await tab.waitForURL(`${LINKEDIN}**`);
      await tab.close();
    });

    test("arriving at the footer shakes the pill once; never after a press", async ({ page }) => {
      await page.goto("/");
      await page.evaluate(() => document.getElementById("contact")?.scrollIntoView({ behavior: "instant" }));
      const wrap = page.locator("#contact .whisper-wrap");
      await expect(wrap).toBeVisible({ timeout: 20_000 });
      await wrap.scrollIntoViewIfNeeded();
      await expect(wrap).toHaveAttribute("data-shakes", "1", { timeout: 3000 });
      await wrap.locator(".whisper").click();
      await page.waitForTimeout(6000);
      await expect(wrap).toHaveAttribute("data-shakes", "1");
    });
  });
}

test.describe("reduced motion", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("a red ring pulse instead of the shake (no transform)", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.evaluate(() => {
      const w = window as unknown as { __shake: string[] };
      w.__shake = [];
      new MutationObserver((list) => {
        for (const m of list) {
          const el = m.target as HTMLElement;
          if (el.classList.contains("is-shaking")) {
            w.__shake.push(`${getComputedStyle(el).animationName}|${getComputedStyle(el, "::after").animationName}`);
          }
        }
      }).observe(document.body, { attributes: true, attributeFilter: ["class"], subtree: true });
      document.getElementById("contact")?.scrollIntoView({ behavior: "instant" });
    });
    const wrap = page.locator("#contact .whisper-wrap");
    await expect(wrap).toBeVisible({ timeout: 20_000 });
    await wrap.scrollIntoViewIfNeeded();
    await expect(wrap).toHaveAttribute("data-shakes", "1", { timeout: 3000 });
    const seen = await page.evaluate(() => (window as unknown as { __shake: string[] }).__shake);
    expect(seen).toEqual(["none|whisper-ring"]);
  });
});

test.describe("hero alien", () => {
  for (const v of [VIEWPORTS[0], VIEWPORTS[1]]) {
    test(`${v.name}: replaces the download icon; a click glides to the pill and plays the clip`, async ({ browser }) => {
      const ctx = await browser.newContext({ viewport: v.viewport, isMobile: v.mobile, hasTouch: v.mobile });
      const page = await ctx.newPage();
      const problems = watch(page);
      await page.goto("/");
      await expect(page.locator("#shell")).toHaveCount(0, { timeout: 20_000 });
      await expect(page.locator('a[download], a[aria-label="Download résumé"]')).toHaveCount(0);
      const alien = page.locator("#home .alien-btn");
      await expect(alien).toBeVisible();
      await alien.click();
      await expect.poll(async () => (await audio(page))?.paused, { timeout: 10_000 }).toBe(false);
      const pill = page.locator("#contact .whisper");
      await expect(pill).toHaveAttribute("data-state", "playing");
      await expect(pill).toBeInViewport();
      expect(problems).toEqual([]);
      await ctx.close();
    });
  }
});
