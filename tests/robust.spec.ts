import { expect, test } from "@playwright/test";

/**
 * Loading must never depend on luck: whatever the visitor does while the page
 * loads, every section arrives by itself; and no browser repaints the light
 * design dark.
 */

test("the page declares light colours only (no automatic dark repaint)", async ({ page }) => {
  await page.emulateMedia({ colorScheme: "dark" });
  await page.goto("/");
  await expect(page.locator('meta[name="color-scheme"]')).toHaveAttribute("content", "only light");
  expect(await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme)).toBe("light only");
  // a phone in dark mode still gets the ivory page
  expect(await page.evaluate(() => getComputedStyle(document.body).backgroundColor)).toBe("rgb(245, 240, 232)");
});

for (const v of [
  { name: "desktop", viewport: { width: 1440, height: 900 }, mobile: false },
  { name: "phone", viewport: { width: 390, height: 844 }, mobile: true },
]) {
  test(`${v.name}: a section started early never stalls the rest`, async ({ browser }) => {
    const ctx = await browser.newContext({ viewport: v.viewport, isMobile: v.mobile, hasTouch: v.mobile });
    const page = await ctx.newPage();
    await page.goto("/");
    // straight after load, jump near the bottom (that section starts out of
    // turn) and back to the top before the queue gets there
    await page.evaluate(() => document.getElementById("perspectives")?.scrollIntoView({ behavior: "instant" }));
    await page.waitForTimeout(60);
    await page.evaluate(() => window.scrollTo(0, 0));
    // no more scrolling: every section must still arrive on its own
    await expect(page.locator(".skel")).toHaveCount(0, { timeout: 15_000 });
    await ctx.close();
  });
}
