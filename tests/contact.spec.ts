import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * "Send a message" — every outcome a visitor can hit, with our own
 * /api/contact mocked in the browser (nothing is ever sent). The server side
 * itself is unit-tested in tests/unit/contact-api.spec.ts.
 */
const API = "**/api/contact";

const json = (body: unknown, status = 200) => (route: Route) =>
  route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });

async function openForm(page: Page) {
  await page.goto("/");
  await page.evaluate(() => document.getElementById("contact")?.scrollIntoView());
  const form = page.locator("#contact form");
  await expect(form).toBeVisible({ timeout: 20_000 });
  return form;
}

async function fill(page: Page, phone = "+91 98765 43210") {
  const form = page.locator("#contact form");
  await form.locator('input[name="name"]').fill("TEST - ignore");
  await form.locator('input[name="phone"]').fill(phone);
  await form.locator('input[name="email"]').fill("test@example.com");
  await form.locator("textarea").fill("Automated test of the portfolio contact form. Please ignore.");
  await form.locator('button[type="submit"]').click();
}

const success = (page: Page) => page.locator("#contact [role=status]").filter({ hasText: "Thanks" });
const failure = (page: Page) => page.locator("#contact [role=alert]");

test("success: posts to /api/contact with the honeypot empty", async ({ page }) => {
  let body: Record<string, unknown> | null = null;
  await page.route(API, async (route) => {
    body = route.request().postDataJSON();
    await json({ ok: true, id: "test-id" })(route);
  });
  await openForm(page);
  await fill(page);
  await expect(success(page)).toContainText("Thanks, TEST — your message is on its way.");
  expect(body).toMatchObject({
    name: "TEST - ignore",
    phone: "+91 98765 43210",
    email: "test@example.com",
    website: "",
  });
});

test("phone formats: 098765 43210 and 9876543210 are accepted", async ({ page }) => {
  await page.route(API, json({ ok: true, id: "x" }));
  for (const phone of ["098765 43210", "9876543210"]) {
    await openForm(page);
    await page.evaluate(() => window.sessionStorage.clear());
    await fill(page, phone);
    await expect(success(page)).toBeVisible();
  }
});

test("a 500 is retried once automatically, then succeeds", async ({ page }) => {
  let calls = 0;
  await page.route(API, async (route) => {
    calls += 1;
    await (calls === 1 ? json({ ok: false, error: "server_error" }, 500) : json({ ok: true, id: "y" }))(route);
  });
  await openForm(page);
  await fill(page);
  await expect(success(page)).toBeVisible({ timeout: 15_000 });
  expect(calls).toBe(2);
});

test("delivery fails twice → Couldn't send automatically + Email me instead + Copy message, text kept", async ({ page }) => {
  let calls = 0;
  await page.route(API, async (route) => {
    calls += 1;
    await json({ ok: false, error: "delivery_failed" }, 502)(route);
  });
  await openForm(page);
  await fill(page);
  await expect(failure(page)).toContainText("Couldn't send automatically", { timeout: 15_000 });
  expect(calls).toBe(2);
  await expect(failure(page).getByRole("link", { name: "Email me instead" })).toHaveAttribute("href", /^mailto:gouranglokwani27@gmail\.com\?/);
  await expect(failure(page).getByRole("button", { name: "Copy message" })).toBeVisible();
  await expect(page.locator('#contact input[name="name"]')).toHaveValue("TEST - ignore");
  // the spinner never sticks: the button is usable again
  await expect(page.locator('#contact button[type="submit"]')).toBeEnabled();
});

test("a server field error lands on that field, no alert, text kept", async ({ page }) => {
  await page.route(API, json({ ok: false, field: "phone", error: "Phone number should have 7–15 digits." }, 400));
  await openForm(page);
  await fill(page);
  const phone = page.locator('#contact input[name="phone"]');
  await expect(phone).toHaveAttribute("aria-invalid", "true");
  await expect(page.locator("#contact")).toContainText("Phone number should have 7–15 digits.");
  await expect(failure(page)).toHaveCount(0);
  await expect(phone).toHaveValue("+91 98765 43210");
});

test("rate limited (429) → a clear message, not retried", async ({ page }) => {
  let calls = 0;
  await page.route(API, async (route) => {
    calls += 1;
    await json({ ok: false, error: "rate_limited" }, 429)(route);
  });
  await openForm(page);
  await fill(page);
  await expect(failure(page)).toContainText("too many messages");
  expect(calls).toBe(1);
});

test("network failure → retried once, then the mailto fallback", async ({ page }) => {
  let calls = 0;
  await page.route(API, async (route) => {
    calls += 1;
    await route.abort("failed");
  });
  await openForm(page);
  await fill(page);
  await expect(failure(page)).toContainText("the connection failed", { timeout: 15_000 });
  expect(calls).toBe(2);
});

test("offline → clear message + mailto fallback", async ({ page, context }) => {
  await openForm(page);
  await context.setOffline(true);
  await fill(page);
  await expect(failure(page)).toContainText("offline");
  await expect(failure(page).getByRole("link", { name: "Email me instead" })).toBeVisible();
  await context.setOffline(false);
});

test("invalid phone → inline error and focus, nothing sent", async ({ page }) => {
  let calls = 0;
  await page.route(API, async (route) => {
    calls += 1;
    await json({ ok: true })(route);
  });
  await openForm(page);
  await fill(page, "12ab");
  const phone = page.locator('#contact input[name="phone"]');
  await expect(phone).toBeFocused();
  await expect(phone).toHaveAttribute("aria-invalid", "true");
  expect(calls).toBe(0);
});
