/**
 * Contact-form delivery, server side (used by api/contact.ts on Vercel and by
 * the local preview/dev middleware in vite.config.ts).
 *
 * The browser posts the form here (same origin, so ad blockers and privacy
 * tools that block third-party form endpoints can't stop it); this module
 * validates it and emails it to the inbox:
 *
 *   1. Resend (RESEND_API_KEY) — success only on 200 with an email id.
 *   2. Web3Forms (WEB3FORMS_KEY) — backup when Resend errors, times out or
 *      isn't configured.
 *
 * Each provider: 8 s timeout, one retry on a 5xx or network error.
 * Never logs visitor data — only the provider and its status.
 * Pure and dependency-free: `fetch`, time and env are injected, so it is unit
 * tested without any network (tests/contact-api.spec.ts).
 */

export const INBOX = "gouranglokwani27@gmail.com";
export const MAX_BODY_BYTES = 10 * 1024;
export const RATE_LIMIT = { max: 5, windowMs: 10 * 60 * 1000 };
const PROVIDER_TIMEOUT_MS = 8000;

export type Field = "name" | "email" | "phone" | "message";

export interface ContactRequest {
  /** Raw request body (string) or an already-parsed JSON object. */
  body: unknown;
  /** Size of the raw body in bytes, when known (Content-Length). */
  bodyBytes?: number;
  method: string;
  ip: string;
  /** The page the form was sent from (Referer / Origin), for the email. */
  page?: string;
}

export interface ContactEnv {
  RESEND_API_KEY?: string;
  WEB3FORMS_KEY?: string;
}

export interface ContactDeps {
  env: ContactEnv;
  fetch: typeof fetch;
  now?: () => number;
  log?: (line: string) => void;
  /** Rate-limit store (per instance; resets on a cold start). */
  hits?: Map<string, number[]>;
}

export interface ContactResponse {
  status: number;
  body: Record<string, unknown>;
}

/* ------------------------------------------------------------ validation */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Trim, drop control characters (keeping newlines in messages). */
function clean(value: unknown, multiline = false): string {
  if (typeof value !== "string") return "";
  const s = multiline
    ? value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
    : value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ");
  return s.trim();
}

export interface Enquiry {
  name: string;
  email: string;
  phone: string;
  message: string;
}

export function validate(raw: Record<string, unknown>): { ok: true; value: Enquiry } | { ok: false; field: Field; error: string } {
  const name = clean(raw.name);
  const email = clean(raw.email).toLowerCase();
  const phone = clean(raw.phone);
  const message = clean(raw.message, true);

  if (name.length < 2 || name.length > 80) return { ok: false, field: "name", error: "Name should be 2–80 characters." };
  if (!EMAIL_RE.test(email) || email.length > 254) return { ok: false, field: "email", error: "That email address doesn't look right." };
  const compact = phone.replace(/[\s+\-().]/g, "");
  if (!/^\d{7,15}$/.test(compact) || !/^\+?[\d\s\-().]+$/.test(phone))
    return { ok: false, field: "phone", error: "Phone number should have 7–15 digits." };
  if (message.length < 10 || message.length > 2000)
    return { ok: false, field: "message", error: "Message should be 10–2000 characters." };
  return { ok: true, value: { name, email, phone, message } };
}

/* ------------------------------------------------------------ the email */

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

function istTime(now: number): string {
  return new Intl.DateTimeFormat("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(now)) + " IST";
}

export function buildEmail(e: Enquiry, now: number, page?: string) {
  const when = istTime(now);
  const tel = e.phone.replace(/[^\d+]/g, "");
  const subject = `New portfolio enquiry from ${e.name}`;
  const text = [
    subject,
    "",
    `Name: ${e.name}`,
    `Email: ${e.email}`,
    `Phone: ${e.phone}`,
    "",
    e.message,
    "",
    `Sent: ${when}`,
    page ? `Page: ${page}` : "",
    "",
    "Reply to this email to answer them directly.",
  ]
    .filter((l, i, a) => !(l === "" && a[i - 1] === ""))
    .join("\n");
  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 14px 6px 0;color:#6b6b6b;font:600 13px/1.4 Arial,sans-serif;vertical-align:top">${label}</td><td style="padding:6px 0;font:15px/1.5 Arial,sans-serif;color:#151515">${value}</td></tr>`;
  const html = `<!doctype html><html><body style="margin:0;background:#f5f0e8;padding:24px">
<div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:14px;padding:24px 26px;border:1px solid #e6dfd3">
<h1 style="margin:0 0 4px;font:800 20px/1.25 Arial,sans-serif;color:#151515">New portfolio enquiry</h1>
<p style="margin:0 0 18px;font:13px/1.4 Arial,sans-serif;color:#6b6b6b">${esc(when)}</p>
<table style="border-collapse:collapse;width:100%">
${row("Name", esc(e.name))}
${row("Email", `<a href="mailto:${esc(e.email)}" style="color:#c42530">${esc(e.email)}</a>`)}
${row("Phone", `<a href="tel:${esc(tel)}" style="color:#c42530">${esc(e.phone)}</a>`)}
</table>
<div style="margin:18px 0 0;padding:14px 16px;background:#f5f0e8;border-radius:10px;font:15px/1.6 Arial,sans-serif;color:#151515;white-space:pre-wrap">${esc(e.message)}</div>
${page ? `<p style="margin:16px 0 0;font:12px/1.4 Arial,sans-serif;color:#8a8a8a">Sent from ${esc(page)}</p>` : ""}
<p style="margin:8px 0 0;font:12px/1.4 Arial,sans-serif;color:#8a8a8a">Reply to this email to answer ${esc(e.name)} directly.</p>
</div></body></html>`;
  return { subject, text, html };
}

/* ------------------------------------------------------------ providers */

type Attempt = { ok: true; id?: string } | { ok: false; status: number | "timeout" | "network"; retryable: boolean };

async function postOnce(deps: ContactDeps, url: string, init: RequestInit, judge: (status: number, data: unknown) => Attempt): Promise<Attempt> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), PROVIDER_TIMEOUT_MS);
  try {
    const res = await deps.fetch(url, { ...init, signal: controller.signal });
    const data = await res.json().catch(() => null);
    return judge(res.status, data);
  } catch (err) {
    const aborted = (err as { name?: string })?.name === "AbortError";
    return { ok: false, status: aborted ? "timeout" : "network", retryable: true };
  } finally {
    clearTimeout(timer);
  }
}

/** One retry on a 5xx, timeout or network error. */
async function withRetry(run: () => Promise<Attempt>): Promise<Attempt> {
  const first = await run();
  if (first.ok || !first.retryable) return first;
  return run();
}

function sendResend(deps: ContactDeps, key: string, e: Enquiry, mail: ReturnType<typeof buildEmail>) {
  return withRetry(() =>
    postOnce(
      deps,
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
        body: JSON.stringify({
          from: "Portfolio <onboarding@resend.dev>",
          to: [INBOX],
          reply_to: e.email,
          subject: mail.subject,
          html: mail.html,
          text: mail.text,
        }),
      },
      (status, data) => {
        const id = (data as { id?: unknown } | null)?.id;
        if (status === 200 && typeof id === "string" && id) return { ok: true, id };
        return { ok: false, status, retryable: status >= 500 };
      }
    )
  );
}

function sendWeb3Forms(deps: ContactDeps, key: string, e: Enquiry, mail: ReturnType<typeof buildEmail>) {
  return withRetry(() =>
    postOnce(
      deps,
      "https://api.web3forms.com/submit",
      {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({
          access_key: key,
          subject: mail.subject,
          from_name: "Portfolio Website",
          name: e.name,
          email: e.email,
          phone: e.phone,
          replyto: e.email,
          message: e.message,
        }),
      },
      (status, data) => {
        if (status === 200 && (data as { success?: unknown } | null)?.success === true) return { ok: true };
        return { ok: false, status, retryable: status >= 500 };
      }
    )
  );
}

/* ------------------------------------------------------------ handler */

function rateLimited(deps: ContactDeps, ip: string, now: number): boolean {
  const hits = deps.hits ?? defaultHits;
  const recent = (hits.get(ip) ?? []).filter((t) => now - t < RATE_LIMIT.windowMs);
  if (recent.length >= RATE_LIMIT.max) {
    hits.set(ip, recent);
    return true;
  }
  recent.push(now);
  hits.set(ip, recent);
  return false;
}
const defaultHits = new Map<string, number[]>();

export async function handleContact(req: ContactRequest, deps: ContactDeps): Promise<ContactResponse> {
  const now = (deps.now ?? Date.now)();
  const log = deps.log ?? (() => undefined);

  if (req.method !== "POST") return { status: 405, body: { ok: false, error: "method_not_allowed" } };

  // body: size first, then JSON
  let raw: unknown = req.body;
  const size =
    req.bodyBytes ?? (typeof raw === "string" ? new TextEncoder().encode(raw).length : new TextEncoder().encode(JSON.stringify(raw ?? "")).length);
  if (size > MAX_BODY_BYTES) return { status: 413, body: { ok: false, error: "too_large" } };
  if (typeof raw === "string") {
    try {
      raw = JSON.parse(raw);
    } catch {
      return { status: 400, body: { ok: false, error: "bad_json" } };
    }
  }
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return { status: 400, body: { ok: false, error: "bad_json" } };
  const data = raw as Record<string, unknown>;

  // honeypot: bots get a quiet "ok" and nothing is sent
  if (clean(data.website) !== "") return { status: 200, body: { ok: true } };

  const checked = validate(data);
  if (!checked.ok) return { status: 400, body: { ok: false, field: checked.field, error: checked.error } };

  if (rateLimited(deps, req.ip || "unknown", now)) return { status: 429, body: { ok: false, error: "rate_limited" } };

  const mail = buildEmail(checked.value, now, req.page);
  const resendKey = (deps.env.RESEND_API_KEY ?? "").trim();
  const w3fKey = (deps.env.WEB3FORMS_KEY ?? "").trim();

  if (resendKey) {
    const r = await sendResend(deps, resendKey, checked.value, mail);
    if (r.ok) {
      log("[contact] provider=resend status=200");
      return { status: 200, body: { ok: true, id: r.id, provider: "resend" } };
    }
    log(`[contact] provider=resend status=${r.status}`);
  } else {
    log("[contact] provider=resend status=not_configured");
  }

  if (w3fKey) {
    const w = await sendWeb3Forms(deps, w3fKey, checked.value, mail);
    if (w.ok) {
      log("[contact] provider=web3forms status=200");
      return { status: 200, body: { ok: true, provider: "web3forms" } };
    }
    log(`[contact] provider=web3forms status=${w.status}`);
  } else {
    log("[contact] provider=web3forms status=not_configured");
  }

  return { status: 502, body: { ok: false, error: "delivery_failed" } };
}
