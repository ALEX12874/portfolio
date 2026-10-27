/**
 * Contact-form delivery. The UI only ever calls `sendEnquiry()`.
 *
 * The form posts to our own `/api/contact` (same origin, so ad blockers and
 * privacy tools that block third-party form services can't stop it). The
 * server validates the enquiry and emails it (Resend, with a backup) — see
 * server/contact.ts. No key is ever in the browser.
 *
 * 15 s timeout, one automatic retry on a network error / timeout / 5xx.
 * Never throws, so the UI can never get stuck.
 */

export interface Enquiry {
  name: string;
  phone: string;
  email: string;
  message: string;
  /** Honeypot — a hidden field real visitors never fill in. */
  website?: string;
}

export type Field = "name" | "phone" | "email" | "message";

export type FailReason = "offline" | "timeout" | "network" | "failed" | "invalid" | "limited";

export type SendResult =
  | { ok: true; id?: string }
  | { ok: false; reason: FailReason; field?: Field; detail?: string };

export const CONTACT_ENDPOINT = "/api/contact";
const TIMEOUT_MS = 15000;
const RETRY_DELAY_MS = 1200;

export const LIMITS = {
  name: 80,
  phone: 24,
  email: 254,
  message: 2000,
} as const;

/** Trim, drop control characters (keeping newlines in messages) and cap length. */
export function clean(value: string, max: number, multiline = false): string {
  const stripped = multiline
    ? value.replace(/\r\n?/g, "\n").replace(/[\u0000-\u0009\u000B-\u001F\u007F]/g, "")
    : value.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ");
  return stripped.trim().slice(0, max);
}

function sanitize(e: Enquiry): Required<Enquiry> {
  return {
    name: clean(e.name, LIMITS.name),
    phone: clean(e.phone, LIMITS.phone),
    email: clean(e.email, LIMITS.email).toLowerCase(),
    message: clean(e.message, LIMITS.message, true),
    website: clean(e.website ?? "", 200),
  };
}

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;
const FIELDS: Field[] = ["name", "phone", "email", "message"];

interface Attempt {
  result: SendResult;
  /** Worth one automatic retry (network error / timeout / 5xx). */
  retryable: boolean;
}

/** One POST to /api/contact with a hard timeout; never throws. */
async function postOnce(body: Required<Enquiry>): Promise<Attempt> {
  if (isOffline()) return { result: { ok: false, reason: "offline" }, retryable: false };
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(CONTACT_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    if (res.ok && data?.ok === true) {
      return { result: { ok: true, id: typeof data.id === "string" ? data.id : undefined }, retryable: false };
    }
    if (res.status === 400 && typeof data?.field === "string" && FIELDS.includes(data.field as Field)) {
      return {
        result: { ok: false, reason: "invalid", field: data.field as Field, detail: String(data.error ?? "") },
        retryable: false,
      };
    }
    if (res.status === 429) return { result: { ok: false, reason: "limited" }, retryable: false };
    return { result: { ok: false, reason: "failed", detail: `HTTP ${res.status}` }, retryable: res.status >= 500 };
  } catch (err) {
    if (isOffline()) return { result: { ok: false, reason: "offline" }, retryable: false };
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return { result: { ok: false, reason: aborted ? "timeout" : "network" }, retryable: true };
  } finally {
    window.clearTimeout(timer);
  }
}

/** Send one enquiry (one automatic retry). Always resolves. */
export async function sendEnquiry(input: Enquiry): Promise<SendResult> {
  try {
    const body = sanitize(input);
    const first = await postOnce(body);
    if (first.result.ok || !first.retryable) return first.result;
    await wait(RETRY_DELAY_MS);
    return (await postOnce(body)).result;
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** mailto: fallback pre-filled with subject, name, phone and message. */
export function mailtoFallback(to: string, e: Pick<Enquiry, "name" | "phone" | "message">): string {
  const name = clean(e.name, LIMITS.name);
  const phone = clean(e.phone, LIMITS.phone);
  const subject = `New portfolio enquiry from ${name || "your website"}`;
  const lines = [clean(e.message, LIMITS.message, true), ""];
  if (name) lines.push(`— ${name}`);
  if (phone) lines.push(`Phone: ${phone}`);
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(lines.join("\n").trim())}`;
}

/** Plain-text copy of the enquiry for the "Copy message" fallback. */
export function enquiryText(e: Pick<Enquiry, "name" | "phone" | "email" | "message">): string {
  return [
    `Name: ${clean(e.name, LIMITS.name)}`,
    `Phone: ${clean(e.phone, LIMITS.phone)}`,
    `Email: ${clean(e.email, LIMITS.email)}`,
    "",
    clean(e.message, LIMITS.message, true),
  ].join("\n");
}
