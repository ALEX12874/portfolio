import { expect, test, type Page } from "@playwright/test";

/**
 * The Venom goo of the footer's "Whisper to me" pill
 * (components/layout/whisperGoo.ts): desktop mice only, only near the
 * button, never in the way. Speed is measured by scripts/perf-web-effect.mjs
 * (results in perf/web-effect.md).
 */
const LINKEDIN = "https://www.linkedin.com/in/gourang-lokwani-438394297/";

async function toPill(page: Page) {
  await page.context().route(`${LINKEDIN}**`, (r) => r.fulfill({ contentType: "text/html", body: "<title>LinkedIn</title>" }));
  await page.goto("/");
  await page.evaluate(() => document.getElementById("contact")?.scrollIntoView({ behavior: "instant" }));
  const pill = page.locator("#contact .whisper");
  await expect(pill).toBeVisible({ timeout: 20_000 });
  await pill.scrollIntoViewIfNeeded();
  // let the arrival shake finish
  await expect(page.locator("#contact .whisper-wrap")).toHaveAttribute("data-shakes", "1", { timeout: 3000 });
  await expect(page.locator("#contact .whisper-wrap")).not.toHaveClass(/is-shaking/);
  return pill;
}

/** Glide the mouse to a spot right of the pill (inside the zone). */
async function nearPill(page: Page) {
  const box = (await page.locator("#contact .whisper").boundingBox())!;
  const x = box.x + box.width + 70;
  const y = box.y + box.height / 2 + 30;
  await page.mouse.move(x + 300, y);
  await page.mouse.move(x, y, { steps: 12 });
  await page.waitForTimeout(400);
  return { box, x, y };
}

test.describe("desktop mouse", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("away from the button: nothing mounts, the form is untouched", async ({ page }) => {
    await toPill(page);
    const form = page.locator("#contact form");
    const before = await form.screenshot();
    // over the hero, the projects and all over the form
    await page.mouse.move(700, 120);
    const fb = (await form.boundingBox())!;
    for (let i = 0; i <= 10; i += 1) await page.mouse.move(fb.x + (fb.width * i) / 10, fb.y + (fb.height * (10 - i)) / 10);
    await page.waitForTimeout(300);
    await expect(page.locator(".whisper-goo")).toHaveCount(0);
    expect(await form.screenshot()).toEqual(before);
  });

  test("near the button: goo reaches from the pill, then pulls back and hands over", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __whisperWebStats: unknown }).__whisperWebStats = { js: [], lat: [] };
    });
    await toPill(page);
    const box = (await page.locator("#contact .whisper").boundingBox())!;
    // right of the pill: where tendrils will reach, and further out, past the pointer
    const reachArea = { x: box.x + box.width + 4, y: box.y - 10, width: 50, height: box.height + 20 };
    const beyond = { x: box.x + box.width + 120, y: box.y - 10, width: 20, height: box.height + 20 };
    await page.mouse.move(box.x + box.width + 600, box.y - 300);
    const quietReach = await page.screenshot({ clip: reachArea });
    const quietBeyond = await page.screenshot({ clip: beyond });

    await nearPill(page);
    const canvas = page.locator(".whisper-goo");
    await expect(canvas).toHaveCount(1);
    await expect(page.locator("#contact .whisper-wrap")).toHaveClass(/is-goo/);
    // the canvas is the zone around the pill only
    const cb = (await canvas.boundingBox())!;
    expect(cb.width).toBeLessThanOrEqual(box.width + 2 * 190 + 1);
    expect(cb.height).toBeLessThanOrEqual(box.height + 2 * 190 + 1);
    expect(await page.evaluate(() => (window as unknown as { __whisperWebStats: { strands: number } }).__whisperWebStats.strands)).toBeGreaterThan(0);
    // goo next to the pill, nothing out past the pointer
    expect((await page.screenshot({ clip: reachArea })).equals(quietReach)).toBe(false);
    expect((await page.screenshot({ clip: beyond })).equals(quietBeyond)).toBe(true);

    // leave: the tendrils snap back; after 2 s at rest the CSS pill takes over
    await page.mouse.move(900, 200);
    await expect(canvas).toHaveCount(0, { timeout: 6000 });
    await expect(page.locator("#contact .whisper-wrap")).not.toHaveClass(/is-goo/);
  });

  test("never in the way: play, triple-click to LinkedIn, send the form", async ({ page }) => {
    await page.route("**/api/contact", (r) =>
      r.fulfill({ contentType: "application/json", body: JSON.stringify({ ok: true, id: "test" }) })
    );
    const pill = await toPill(page);
    await nearPill(page);
    await expect(page.locator(".whisper-goo")).toHaveCount(1);
    await pill.click();
    await expect(pill).toHaveAttribute("data-state", "playing");
    await expect(pill).toHaveAttribute("data-state", "idle", { timeout: 6000 });
    await page.waitForTimeout(700);
    const popup = page.waitForEvent("popup");
    await pill.click({ clickCount: 3 });
    const tab = await popup;
    await tab.waitForURL(`${LINKEDIN}**`);
    await tab.close();
    const form = page.locator("#contact form");
    await form.locator('input[name="name"]').fill("TEST - ignore");
    await form.locator('input[name="phone"]').fill("+91 98765 43210");
    await form.locator('input[name="email"]').fill("test@example.com");
    await form.locator("textarea").fill("Automated test of the portfolio contact form. Please ignore.");
    await form.locator('button[type="submit"]').click();
    await expect(page.locator("#contact [role=status]").filter({ hasText: "Thanks" })).toBeVisible();
  });
});

for (const [name, opts] of [
  ["touch phone", { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }],
  ["reduced motion", { viewport: { width: 1440, height: 900 } }],
] as const) {
  test.describe(name, () => {
    test.use(opts);
    test("nothing loads, nothing mounts", async ({ page }) => {
      if (name === "reduced motion") await page.emulateMedia({ reducedMotion: "reduce" });
      const chunks: string[] = [];
      page.on("request", (r) => {
        if (r.url().includes("whisperGoo")) chunks.push(r.url());
      });
      const pill = await toPill(page);
      const box = (await pill.boundingBox())!;
      await page.mouse.move(box.x + box.width + 60, box.y + 20, { steps: 8 });
      await page.waitForTimeout(500);
      await expect(page.locator(".whisper-goo")).toHaveCount(0);
      expect(chunks).toEqual([]);
    });
  });
}

test.describe("the button's lane", () => {
  test.use({ viewport: { width: 1440, height: 900 } });
  test("anywhere along the button's row wakes the goo; leaving the row lets it go", async ({ page }) => {
    await page.addInitScript(() => {
      (window as unknown as { __whisperWebStats: unknown }).__whisperWebStats = { js: [], lat: [] };
    });
    await toPill(page);
    const rowBox = async () => (await page.locator("#contact .whisper-wrap").locator("xpath=..").boundingBox())!;
    const pill = (await page.locator("#contact .whisper").boundingBox())!;
    let row = await rowBox();
    // far to the right of the pill (beyond the 140 px zone), inside its row
    const x = Math.min(row.x + row.width - 10, pill.x + pill.width + 300);
    await page.mouse.move(x, row.y - 300);
    row = await rowBox(); // measured right before entering (the page may have settled)
    const y = row.y + row.height / 2;
    await page.mouse.move(x, y);
    await page.waitForTimeout(500);
    await expect(page.locator(".whisper-goo")).toHaveCount(1);
    expect(await page.evaluate(() => (window as unknown as { __whisperWebStats: { strands: number } }).__whisperWebStats.strands)).toBeGreaterThan(0);
    await page.mouse.move(x, y - 300, { steps: 4 });
    await expect(page.locator(".whisper-goo")).toHaveCount(0, { timeout: 6000 });
  });
});
