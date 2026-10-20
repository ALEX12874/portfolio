import { devices, expect, test, type Page } from "@playwright/test";

/**
 * Smoke test run by `npm run check` before every deploy: tour the whole page
 * and fail on any console error or warning, page error, unhandled promise
 * rejection or failed request.
 *
 *   - scroll every section into view (all deferred chunks mount)
 *   - open the menu and navigate with it
 *   - switch all 4 projects
 *   - open both experiences (and the certificate viewer)
 *   - contact form: empty submit shows inline errors (nothing is sent)
 *   - the Real Me spider sorts at least one problem (counter rises); a click
 *     throws a bug; skill nodes respond; on a landscape phone the one-screen
 *     layout, chip tooltips and live rotation work
 *   - the hero billboard pops on hover (desktop) and on tap (phone)
 */

type Problems = string[];

function watch(page: Page): Problems {
  const problems: Problems = [];
  page.on("console", (m) => {
    if (m.type() === "error" || m.type() === "warning") problems.push(`console ${m.type()}: ${m.text()}`);
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

/** Problems plus any promise rejection the page caught (main.tsx records them). */
async function allProblems(page: Page, problems: Problems) {
  const rejected = await page.evaluate(
    () => (window as unknown as { __unhandledRejections?: string[] }).__unhandledRejections ?? []
  );
  return [...problems, ...rejected.map((r) => `unhandled rejection: ${r}`)];
}

async function menuNavigates(page: Page) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.getByRole("button", { name: /menu/i }).first().click();
  const dialog = page.getByRole("dialog");
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: /Perspectives/ }).click();
  await expect(dialog).toHaveCount(0);
  await expect
    .poll(
      () =>
        page.evaluate(() => {
          const r = document.getElementById("perspectives")?.getBoundingClientRect();
          return !!r && r.top < window.innerHeight / 2 && r.bottom > 0;
        }),
      { timeout: 6000 }
    )
    .toBe(true);
}

async function certificateViewer(page: Page) {
  await page.evaluate(() => document.getElementById("experience")?.scrollIntoView({ behavior: "instant" }));
  const rows = page.locator("#experience button[aria-label$='open details']");
  for (let i = 0; i < 2; i += 1) {
    await rows.nth(i).click();
    const larger = page.getByRole("button", { name: "View certificate larger" });
    if (await larger.count()) {
      await larger.first().click();
      const close = page.getByRole("button", { name: "Close certificate viewer" });
      await expect(close).toBeVisible();
      await close.click();
      await expect(close).toHaveCount(0);
      await page.keyboard.press("Escape");
      await expect(page.getByRole("dialog")).toHaveCount(0);
      return;
    }
    await page.keyboard.press("Escape");
    await expect(page.getByRole("dialog")).toHaveCount(0);
  }
  throw new Error("no experience offers a certificate viewer");
}

async function contactValidation(page: Page) {
  await page.evaluate(() => document.getElementById("contact")?.scrollIntoView({ behavior: "instant" }));
  const form = page.locator("#contact form");
  await form.locator("button[type=submit]").click();
  await expect(form.locator("[aria-invalid=true]").first()).toBeVisible();
}

async function realMeInteractions(page: Page) {
  await page.evaluate(() => document.getElementById("real-me")?.scrollIntoView({ behavior: "instant" }));
  await page.waitForTimeout(2500);
  // throw a bug onto the web, away from the copy and the nodes
  const sec = page.locator("#real-me");
  const box = await sec.boundingBox();
  if (!box) throw new Error("Real Me has no box");
  const hub = await sec.evaluate((el) => ({
    x: parseFloat(getComputedStyle(el).getPropertyValue("--hub-x")),
    y: parseFloat(getComputedStyle(el).getPropertyValue("--hub-y")),
  }));
  await page.mouse.click(box.x + hub.x + 90, box.y + hub.y + 20);
  await page.locator("#real-me [data-node] .realme-card").first().hover();
  await page.waitForTimeout(800);
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
    test.setTimeout(180_000);
    const problems = watch(page);
    await page.goto("/");
    await page.waitForLoadState("load");

    // billboard pop on hover: live 3D board or the video hotspot
    const stage = page.locator("[data-hero-stage]");
    // desktop runs live 3D unless the device is too slow: give the scene up
    // to 20 s to warm up and take over, otherwise test the video hotspot
    await expect
      .poll(() => stage.getAttribute("data-hero-mode"), { timeout: 20_000 })
      .toBe("live")
      .catch(() => undefined);
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
    await menuNavigates(page);
    await projectsAndExperience(page);
    await certificateViewer(page);
    await contactValidation(page);
    await realMeInteractions(page);
    await spiderSorts(page);

    const all = await allProblems(page, problems);
    expect(all, all.join("\n")).toEqual([]);
  });
});

test.describe("phone", () => {
  const { defaultBrowserType: _ignored, ...iphone } = devices["iPhone 13"];
  test.use(iphone);

  test("tour, spider, billboard tap", async ({ page }) => {
    const problems = watch(page);
    // record every pop/settle with the page's own clock, so the hold time is
    // measured exactly even when the test machine is busy
    await page.addInitScript(() => {
      const w = window as unknown as { __pops: [string, number][] };
      w.__pops = [];
      new MutationObserver((list) =>
        list.forEach((m) => {
          const v = (m.target as Element).getAttribute("data-popped");
          if (v) w.__pops.push([v, performance.now()]);
        })
      ).observe(document, { subtree: true, attributes: true, attributeFilter: ["data-popped"] });
    });
    await page.goto("/");
    await page.waitForLoadState("load");

    const hotspot = page.locator("[data-billboard-hotspot]");
    await hotspot.scrollIntoViewIfNeeded();
    await hotspot.tap();
    await expect(hotspot).toHaveAttribute("data-popped", "1");
    await expect(hotspot).toHaveAttribute("data-popped", "0", { timeout: 15_000 });
    // a tap pops the board and it settles by itself after ~1.6 s
    const pops = await page.evaluate(() => (window as unknown as { __pops: [string, number][] }).__pops);
    const up = pops.find(([v]) => v === "1")?.[1] ?? NaN;
    const down = pops.find(([v, t]) => v === "0" && t > up)?.[1] ?? NaN;
    // held for the full ~1.6 s, then settled by itself (the expect above
    // already proved it settles; on a busy machine the timer may run late)
    expect(down - up).toBeGreaterThan(1400);

    await tour(page);
    await menuNavigates(page);
    await projectsAndExperience(page);
    await spiderSorts(page);

    const all = await allProblems(page, problems);
    expect(all, all.join("\n")).toEqual([]);
  });
});

test.describe("landscape phone", () => {
  test.use({ viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });

  test("Real Me: one screen, chip tooltips, live rotation", async ({ page }) => {
    const problems = watch(page);
    await page.goto("/");
    await page.waitForLoadState("load");
    await tour(page);
    const sec = page.locator("#real-me");
    await page.evaluate(() => document.getElementById("real-me")?.scrollIntoView({ behavior: "instant" }));
    await expect(sec).toHaveClass(/realme--land/);
    expect(Math.round((await sec.boundingBox())?.height ?? 0)).toBe(390);

    // every chip opens its one-liner
    const chips = sec.locator("[data-node] .realme-card");
    await expect(chips).toHaveCount(5);
    for (let i = 0; i < 5; i += 1) {
      await chips.nth(i).tap();
      await expect(sec.locator("[data-node] .realme-tip").nth(i)).toBeVisible();
    }
    await spiderSorts(page);

    // rotate to portrait and back: the layout follows live
    await page.setViewportSize({ width: 390, height: 844 });
    await expect(sec).not.toHaveClass(/realme--land/);
    await page.setViewportSize({ width: 844, height: 390 });
    await expect(sec).toHaveClass(/realme--land/);
    await expect(sec).toHaveAttribute("data-rotating", "false", { timeout: 3000 });

    const all = await allProblems(page, problems);
    expect(all, all.join("\n")).toEqual([]);
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
    const all = await allProblems(page, problems);
    expect(all, all.join("\n")).toEqual([]);
  });
});
