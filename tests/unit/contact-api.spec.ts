import { expect, test } from "@playwright/test";
import { handleContact, type ContactDeps } from "../../server/contact";

/**
 * Unit tests for the /api/contact handler (server/contact.ts). fetch is
 * mocked: no email is sent and no network is used.
 */
type Call = { url: string; body: Record<string, unknown>; auth?: string };

function mockFetch(responses: Array<{ status: number; body: unknown } | "network">) {
  const calls: Call[] = [];
  const fn = (async (url: string | URL | Request, init?: RequestInit) => {
    const headers = (init?.headers ?? {}) as Record<string, string>;
    calls.push({ url: String(url), body: JSON.parse(String(init?.body ?? "{}")), auth: headers.Authorization });
    const next = responses.shift() ?? { status: 500, body: {} };
    if (next === "network") throw new TypeError("fetch failed");
    return new Response(JSON.stringify(next.body), { status: next.status, headers: { "Content-Type": "application/json" } });
  }) as typeof fetch;
  return { fn, calls };
}

const valid = {
  name: "Asha Verma",
  email: "Asha@Example.com",
  phone: "+91 98765 43210",
  message: "Hello! I would love to talk about a brand project.",
  website: "",
};

function deps(fetchImpl: typeof fetch, env: ContactDeps["env"] = { RESEND_API_KEY: "re_test" }): ContactDeps {
  return { env, fetch: fetchImpl, hits: new Map(), now: () => Date.UTC(2026, 9, 28, 6, 30), log: () => undefined };
}

const post = (body: unknown, d: ContactDeps, ip = "1.2.3.4") =>
  handleContact({ method: "POST", body: JSON.stringify(body), ip, page: "https://gouranglokwani.in/" }, d);

test("valid enquiry: Resend once, 200 with the email id", async () => {
  const f = mockFetch([{ status: 200, body: { id: "email_123" } }]);
  const r = await post(valid, deps(f.fn));
  expect(r).toEqual({ status: 200, body: { ok: true, id: "email_123", provider: "resend" } });
  expect(f.calls).toHaveLength(1);
  const c = f.calls[0];
  expect(c.url).toBe("https://api.resend.com/emails");
  expect(c.auth).toBe("Bearer re_test");
  expect(c.body.to).toEqual(["gouranglokwani27@gmail.com"]);
  expect(c.body.from).toBe("Portfolio <onboarding@resend.dev>");
  expect(c.body.reply_to).toBe("asha@example.com");
  expect(c.body.subject).toBe("New portfolio enquiry from Asha Verma");
  expect(String(c.body.html)).toContain('href="mailto:asha@example.com"');
  expect(String(c.body.html)).toContain('href="tel:+919876543210"');
  expect(String(c.body.text)).toContain("IST");
  expect(String(c.body.text)).toContain("Page: https://gouranglokwani.in/");
});

test("phone formats: +91 98765 43210, 098765 43210, 9876543210, (0141) 234-5678 all pass", async () => {
  for (const phone of ["+91 98765 43210", "098765 43210", "9876543210", "(0141) 234-5678"]) {
    const f = mockFetch([{ status: 200, body: { id: "e" } }]);
    const r = await post({ ...valid, phone }, deps(f.fn));
    expect(r.status, phone).toBe(200);
  }
});

const invalid: Array<[string, Record<string, unknown>, string]> = [
  ["name too short", { name: "A" }, "name"],
  ["name too long", { name: "x".repeat(81) }, "name"],
  ["bad email", { email: "not-an-email" }, "email"],
  ["email too long", { email: `${"a".repeat(250)}@x.co` }, "email"],
  ["phone too short", { phone: "12345" }, "phone"],
  ["phone too long", { phone: "1234567890123456" }, "phone"],
  ["phone with letters", { phone: "98765abc43" }, "phone"],
  ["message too short", { message: "Hi there" }, "message"],
  ["message too long", { message: "x".repeat(2001) }, "message"],
];
for (const [label, patch, field] of invalid) {
  test(`invalid: ${label} gives 400 on "${field}", nothing sent`, async () => {
    const f = mockFetch([]);
    const r = await post({ ...valid, ...patch }, deps(f.fn));
    expect(r.status).toBe(400);
    expect(r.body).toMatchObject({ ok: false, field });
    expect(f.calls).toHaveLength(0);
  });
}

test("control characters are stripped before validating and sending", async () => {
  const f = mockFetch([{ status: 200, body: { id: "e" } }]);
  const r = await post({ ...valid, name: `  Asha${String.fromCharCode(0)} Verma${String.fromCharCode(7)} ` }, deps(f.fn));
  expect(r.status).toBe(200);
  expect(f.calls[0].body.subject).toBe("New portfolio enquiry from Asha Verma");
});

test("honeypot filled: 200 ok, nothing sent", async () => {
  const f = mockFetch([]);
  const r = await post({ ...valid, website: "http://spam.example" }, deps(f.fn));
  expect(r).toEqual({ status: 200, body: { ok: true } });
  expect(f.calls).toHaveLength(0);
});

test("Resend 500, one retry, still 500, then the Web3Forms backup delivers", async () => {
  const f = mockFetch([
    { status: 500, body: { message: "boom" } },
    { status: 500, body: { message: "boom" } },
    { status: 200, body: { success: true } },
  ]);
  const r = await post(valid, deps(f.fn, { RESEND_API_KEY: "re_test", WEB3FORMS_KEY: "w3f_test" }));
  expect(r).toEqual({ status: 200, body: { ok: true, provider: "web3forms" } });
  expect(f.calls.map((c) => c.url)).toEqual([
    "https://api.resend.com/emails",
    "https://api.resend.com/emails",
    "https://api.web3forms.com/submit",
  ]);
  expect(f.calls[2].body.access_key).toBe("w3f_test");
});

test("Resend network error is retried once, then succeeds", async () => {
  const f = mockFetch(["network", { status: 200, body: { id: "after_retry" } }]);
  const r = await post(valid, deps(f.fn));
  expect(r.body).toMatchObject({ ok: true, id: "after_retry" });
  expect(f.calls).toHaveLength(2);
});

test("Resend 4xx (e.g. a bad key) is not retried and goes straight to the backup", async () => {
  const f = mockFetch([
    { status: 401, body: { message: "API key is invalid" } },
    { status: 200, body: { success: true } },
  ]);
  const r = await post(valid, deps(f.fn, { RESEND_API_KEY: "re_bad", WEB3FORMS_KEY: "w3f" }));
  expect(r.body).toMatchObject({ ok: true, provider: "web3forms" });
  expect(f.calls).toHaveLength(2);
});

test("200 without an email id is not a success", async () => {
  const f = mockFetch([{ status: 200, body: {} }]);
  const r = await post(valid, deps(f.fn));
  expect(r).toEqual({ status: 502, body: { ok: false, error: "delivery_failed" } });
});

test("every provider fails: 502 delivery_failed", async () => {
  const f = mockFetch(["network", "network", { status: 503, body: {} }, { status: 503, body: {} }]);
  const r = await post(valid, deps(f.fn, { RESEND_API_KEY: "re", WEB3FORMS_KEY: "w3f" }));
  expect(r).toEqual({ status: 502, body: { ok: false, error: "delivery_failed" } });
  expect(f.calls).toHaveLength(4);
});

test("no provider configured: 502, nothing sent", async () => {
  const f = mockFetch([]);
  const r = await post(valid, deps(f.fn, {}));
  expect(r.status).toBe(502);
  expect(f.calls).toHaveLength(0);
});

test("rate limit: the 6th send from one IP within 10 minutes gives 429", async () => {
  const f = mockFetch(Array.from({ length: 6 }, () => ({ status: 200, body: { id: "e" } })));
  const d = deps(f.fn);
  for (let i = 0; i < 5; i += 1) expect((await post(valid, d)).status).toBe(200);
  const sixth = await post(valid, d);
  expect(sixth).toEqual({ status: 429, body: { ok: false, error: "rate_limited" } });
  // another visitor is unaffected
  expect((await post(valid, d, "5.6.7.8")).status).toBe(200);
});

test("rate limit window: allowed again after 10 minutes", async () => {
  const f = mockFetch(Array.from({ length: 7 }, () => ({ status: 200, body: { id: "e" } })));
  let t = Date.UTC(2026, 9, 28, 6, 0);
  const d: ContactDeps = { env: { RESEND_API_KEY: "re" }, fetch: f.fn, hits: new Map(), now: () => t, log: () => undefined };
  for (let i = 0; i < 5; i += 1) await post(valid, d);
  expect((await post(valid, d)).status).toBe(429);
  t += 10 * 60 * 1000 + 1;
  expect((await post(valid, d)).status).toBe(200);
});

test("oversized body (over 10 kB) gives 413, nothing sent", async () => {
  const f = mockFetch([]);
  const r = await post({ ...valid, message: "x".repeat(11 * 1024) }, deps(f.fn));
  expect(r).toEqual({ status: 413, body: { ok: false, error: "too_large" } });
  expect(f.calls).toHaveLength(0);
});

test("bad JSON gives 400; wrong method gives 405", async () => {
  const f = mockFetch([]);
  expect((await handleContact({ method: "POST", body: "{not json", ip: "1" }, deps(f.fn))).status).toBe(400);
  expect((await handleContact({ method: "GET", body: "", ip: "1" }, deps(f.fn))).status).toBe(405);
});

test("logs carry only the provider and a status, never visitor data", async () => {
  const lines: string[] = [];
  const f = mockFetch([{ status: 500, body: {} }, { status: 500, body: {} }]);
  const d = { ...deps(f.fn), log: (l: string) => lines.push(l) };
  await post(valid, d);
  expect(lines.length).toBeGreaterThan(0);
  for (const l of lines) {
    expect(l).toMatch(/^\[contact\] provider=\w+ status=\w+$/);
    expect(l).not.toContain("Asha");
    expect(l).not.toContain("example.com");
  }
});
