import { devices, expect, test, type Page } from "@playwright/test";

/**
 * Smoke test run by `npm run check` before every deploy: tour the whole page
 * and fail on any console error, page error or failed request.
 *
 *   - scroll every section into view (all deferred chunks mount)
 *   - switch all 4 projects
 *   - open both experiences
 *   - the Real Me spider sorts at least one problem (counter rises)
 *   - the hero billboard pops on hover (desktop) and on tap (phone)
 */

type Problems = string[];

function watch(page: Page): Problems {
  const problems: Problems = [];
  page.on("console", (m) => {
    if (m.type() === "error") problems.push(`console: ${m.text()}`);
  });
  page.on("pageerror", (e) => problems.push(`pageerror: ${e.message}`));
  page.on("requestfailed", (r) => {
    const why = r.failure()?.errorText ?? "";
    // media range requests are aborted when a video switches source
    if (/ERR_ABORTED|NS_BINDING_ABORTED/.test(why)) return;
    problems.push(`request failed: ${why} ${r.url()}`);
  });
  page.on("response", (r) => {
    if (r.status() >= 400) problems.push(`HTTP ${r.status()} ${r.url()}`);
  });
  return problems;
}

async function tour(page: Page) {
  for (let i = 0; i < 40; i += 1) {
    await page.mouse.wheel(0, 500);
    await page.waitForTimeout(40);
  }
  for (const id of ["home", "capabilities", "projects", "experience", "real-me", "perspectives", "contact"]) {
    await page.evaluate((s) => document.getElementById(s)?.scrollIntoView({ behavior: "instant" }), id);
    await page.waitForTimeout(250);
  }
}

async function projectsAndExperience(page: Page) {
  await page.evaluate(() => document.getElementById("projects")?.scrollIntoView({ behavior: "instant" }));
  const tabs = page.locator("#projects nav[aria-label=Projects] button");
  await expect(tabs).toHaveCount(4);
  for (let i = 3; i >= 0; i -= 1) {
    await tabs.nth(i).click();
    await expect(tabs.nth(i)).toHaveAttribute("aria-current", "true");
    await page.waitForTimeout(500);
  }

  await page.evaluate(() => document.getElementById("experience")?.scrollIntoView({ behavior: "instant" }));
  const rows = page.locator("#experience button[aria-label$='open details']");
  await expect(rows).toHaveCount(2);
  for (let i = 0; i < 2; i += 1) {
    await rows.nth(i).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await page.waitForTimeout(400);
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
}

async function spiderSorts(page: Page) {
  await page.evaluate(() => document.getElementById("real-me")?.scrollIntoView({ behavior: "instant" }));
  const counter = page.locator("#real-me [aria-live]");
  await expect
    .poll(async () => Number((await counter.innerText()).replace(/\D/g, "").slice(-2)), { timeout: 25_000 })
    .toBeGreaterThan(0);
}

test.describe("desktop", () => {
  test.use({ viewport: { width: 1440, height: 900 } });

  test("tour, projects, experience, spider, billboard hover", async ({ page }) => {
    const problems = watch(page);
    await page.goto("/");
    await page.waitForLoadState("load");

    // billboard pop on hover: live 3D board or the video hotspot
    const stage = page.locator("[data-hero-stage]");
    await page.waitForTimeout(1500);
    const mode = await stage.getAttribute("data-hero-mode");
    if (mode === "live") {
      const canvas = stage.locator("canvas");
      await expect(canvas).toHaveAttribute("data-billboard-at", /\d+,\d+/);
      const [x, y] = ((await canvas.getAttribute("data-billboard-at")) ?? "0,0").split(",").map(Number);
      const box = await canvas.boundingBox();
      if (!box) throw new Error("hero canvas has no box");
      await page.mouse.move(box.x + x, box.y + y, { steps: 4 });
      await expect(canvas).toHaveAttribute("data-billboard-popped", "1");
      await page.mouse.move(5, 5);
      await expect(canvas).toHaveAttribute("data-billboard-popped", "0");
    } else {
      const hotspot = page.locator("[data-billboard-hotspot]");
      await hotspot.hover();
      await expect(hotspot).toHaveAttribute("data-popped", "1");
      await page.mouse.move(5, 5);
      await expect(hotspot).toHaveAttribute("data-popped", "0");
    }

    await tour(page);
    await projectsAndExperience(page);
    await spiderSorts(page);

    expect(problems, problems.join("\n")).toEqual([]);
  });
});

test.describe("phone", () => {
  const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 13"];
  test.use(iphone);

  test("tour, spider, billboard tap", async ({ page }) => {
    const problems = watch(page);
    await page.goto("/");
    await page.waitForLoadState("load");

    const hotspot = page.locator("[data-billboard-hotspot]");
    await hotspot.scrollIntoViewIfNeeded();
    await hotspot.tap();
    await expect(hotspot).toHaveAttribute("data-popped", "1");
    // auto-settles after 1.6 s
    await expect(hotspot).toHaveAttribute("data-popped", "0", { timeout: 4000 });

    await tour(page);
    await projectsAndExperience(page);
    await spiderSorts(page);

    expect(problems, problems.join("\n")).toEqual([]);
  });
});

test.describe("small phone", () => {
  test.use({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test("the spider still finds room on the narrowest phones", async ({ page }) => {
    const problems = watch(page);
    await page.goto("/");
    await page.waitForLoadState("load");
    await tour(page);
    await spiderSorts(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBe(0);
    expect(problems, problems.join("\n")).toEqual([]);
  });
});
