import { expect, test, type Page, type Route } from "@playwright/test";

/**
 * "Send a message" — every outcome a visitor can hit, with the network mocked:
 * FormSubmit (primary) and Web3Forms (backup, built with a placeholder key).
 */
const FORMSUBMIT = "https://formsubmit.co/**";
const WEB3FORMS = "https://api.web3forms.com/**";

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

test("FormSubmit success (and a +91 phone number is accepted)", async ({ page }) => {
  let body: Record<string, unknown> | null = null;
  await page.route(FORMSUBMIT, async (route) => {
    body = route.request().postDataJSON();
    await json({ success: "true", message: "The form was submitted successfully." })(route);
  });
  await openForm(page);
  await fill(page);
  await expect(success(page)).toContainText("Thanks, TEST");
  expect(body).toMatchObject({
    name: "TEST - ignore",
    phone: "+91 98765 43210",
    email: "test@example.com",
    _replyto: "test@example.com",
    _subject: "New portfolio enquiry from TEST - ignore",
    _template: "table",
    _captcha: "false",
    _honey: "",
  });
});

test("FormSubmit success:false → Web3Forms backup succeeds", async ({ page }) => {
  let w3fBody: Record<string, unknown> | null = null;
  await page.route(FORMSUBMIT, json({ success: "false", message: "Something went wrong" }));
  await page.route(WEB3FORMS, async (route) => {
    w3fBody = route.request().postDataJSON();
    await json({ success: true })(route);
  });
  await openForm(page);
  await fill(page);
  await expect(success(page)).toBeVisible();
  expect(w3fBody).toMatchObject({ botcheck: false, from_name: "Portfolio Website", replyto: "test@example.com" });
});

test("both providers fail → clear message + Email me instead + Copy message", async ({ page }) => {
  await page.route(FORMSUBMIT, json({ message: "Server error" }, 500));
  await page.route(WEB3FORMS, json({ success: false, message: "Invalid access key" }));
  await openForm(page);
  await fill(page);
  await expect(failure(page)).toContainText("Couldn't send automatically");
  await expect(failure(page).locator('a[href^="mailto:gouranglokwani27@gmail.com"]')).toHaveText("Email me instead");
  await expect(page.getByRole("button", { name: "Copy message" })).toBeVisible();
  // the visitor's text is kept and the button is usable again
  await expect(page.locator("#contact textarea")).toHaveValue(/Automated test/);
  await expect(page.locator('#contact form button[type="submit"]')).toBeEnabled();
});

test("FormSubmit not activated yet → 'waiting to be activated'", async ({ page }) => {
  await page.route(FORMSUBMIT, json({ success: "false", message: "This form needs Activation. We've sent you an email containing an 'Activate Form' link." }));
  await page.route(WEB3FORMS, json({ success: false, message: "Invalid access key" }));
  await openForm(page);
  await fill(page);
  await expect(failure(page)).toContainText("waiting to be activated");
});

test("timeout → error, spinner never stuck", async ({ page }) => {
  await page.route(FORMSUBMIT, () => new Promise(() => {}));
  await page.route(WEB3FORMS, () => new Promise(() => {}));
  await openForm(page);
  await fill(page);
  await expect(failure(page)).toContainText("too long", { timeout: 70_000 });
  await expect(page.locator('#contact form button[type="submit"]')).toBeEnabled();
});

test("offline → clear message + mailto fallback", async ({ page, context }) => {
  await openForm(page);
  await context.setOffline(true);
  await fill(page);
  await expect(failure(page)).toContainText("offline");
  await expect(failure(page).locator('a[href^="mailto:"]')).toBeVisible();
});

test("invalid phone → inline error and focus", async ({ page }) => {
  await openForm(page);
  await fill(page, "12ab");
  await expect(page.locator("#contact form [id$='-phone-error']")).toBeVisible();
  await expect(page.locator('#contact input[name="phone"]')).toBeFocused();
});
