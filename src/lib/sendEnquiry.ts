/**
 * Contact-form delivery. The UI only ever calls `sendEnquiry()`; to move to
 * a serverless route later, change the provider functions below and leave
 * the form untouched.
 *
 * 1. Primary — FormSubmit (no API key): POST JSON to `site.contactEndpoint`.
 *    The first ever submission makes FormSubmit email the inbox an
 *    "Activate Form" link; until it's clicked, replies say activation is
 *    needed (reported as reason "pending").
 * 2. Backup — Web3Forms, only when VITE_WEB3FORMS_KEY is set at build time.
 *
 * Each request: 12 s timeout, one automatic retry after 1.5 s on network
 * errors / 5xx / timeouts, then the next provider. Never throws.
 */
import { site } from "../data/site";

export interface Enquiry {
  name: string;
  phone: string;
  email: string;
  message: string;
  /** Honeypot — real users never tick it. */
  botcheck?: boolean;
}

export type FailReason = "offline" | "timeout" | "rejected" | "network" | "pending";

export type SendResult = { ok: true } | { ok: false; reason: FailReason; detail?: string };

const WEB3FORMS_URL = "https://api.web3forms.com/submit";
const TIMEOUT_MS = 12000;
const RETRY_DELAY_MS = 1500;

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

function sanitize(e: Enquiry): Enquiry {
  return {
    name: clean(e.name, LIMITS.name),
    phone: clean(e.phone, LIMITS.phone),
    email: clean(e.email, LIMITS.email).toLowerCase(),
    message: clean(e.message, LIMITS.message, true),
    botcheck: !!e.botcheck,
  };
}

const wait = (ms: number) => new Promise((r) => window.setTimeout(r, ms));
const isOffline = () => typeof navigator !== "undefined" && navigator.onLine === false;

interface Attempt {
  result: SendResult;
  /** Worth one automatic retry (network error / 5xx / timeout). */
  retryable: boolean;
}

type Judge = (data: Record<string, unknown> | null, res: Response) => SendResult;

/** One JSON POST with a hard timeout; never throws. */
async function postJson(url: string, body: unknown, judge: Judge): Promise<Attempt> {
  if (isOffline()) return { result: { ok: false, reason: "offline" }, retryable: false };
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    const result = judge(data, res);
    return { result, retryable: !result.ok && res.status >= 500 };
  } catch (err) {
    if (isOffline()) return { result: { ok: false, reason: "offline" }, retryable: false };
    const aborted = err instanceof DOMException && err.name === "AbortError";
    return { result: { ok: false, reason: aborted ? "timeout" : "network" }, retryable: true };
  } finally {
    window.clearTimeout(timer);
  }
}

/** Run an attempt, retrying once (after 1.5 s) on network errors / 5xx / timeouts. */
async function withRetry(run: () => Promise<Attempt>): Promise<SendResult> {
  const first = await run();
  if (first.result.ok || !first.retryable) return first.result;
  await wait(RETRY_DELAY_MS);
  return (await run()).result;
}

const messageOf = (data: Record<string, unknown> | null, res: Response) =>
  typeof data?.message === "string" ? data.message : `HTTP ${res.status}`;

/** FormSubmit: sent only when `success` is true or "true". */
function postFormSubmit(e: Enquiry): Promise<SendResult> {
  return withRetry(() =>
    postJson(
      site.contactEndpoint,
      {
        name: e.name,
        email: e.email,
        phone: e.phone,
        message: e.message,
        _subject: `New portfolio enquiry from ${e.name}`,
        _replyto: e.email,
        _template: "table",
        _captcha: "false",
        _honey: "",
      },
      (data, res) => {
        const success = data?.success === true || data?.success === "true";
        if (res.ok && success) return { ok: true };
        const message = messageOf(data, res);
        // first-ever submission: FormSubmit asks the owner to activate the form
        if (/activat|confirm/i.test(message)) return { ok: false, reason: "pending", detail: message };
        return { ok: false, reason: "rejected", detail: message };
      }
    )
  );
}

/** Web3Forms backup: success only when data.success === true. */
function postWeb3Forms(key: string, e: Enquiry): Promise<SendResult> {
  return withRetry(() =>
    postJson(
      WEB3FORMS_URL,
      {
        access_key: key,
        subject: `New portfolio enquiry from ${e.name}`,
        from_name: "Portfolio Website",
        name: e.name,
        email: e.email,
        phone: e.phone,
        replyto: e.email,
        message: e.message,
        botcheck: false,
      },
      (data, res) =>
        res.ok && data?.success === true
          ? { ok: true }
          : { ok: false, reason: "rejected", detail: messageOf(data, res) }
    )
  );
}

/**
 * Send one enquiry: FormSubmit first, then Web3Forms (if a key was built in).
 * A ticked honeypot short-circuits to a silent "success" so bots learn
 * nothing. Always resolves, so the UI can never get stuck.
 */
export async function sendEnquiry(input: Enquiry): Promise<SendResult> {
  const e = sanitize(input);
  if (e.botcheck) return { ok: true };

  try {
    const primary = await postFormSubmit(e);
    if (primary.ok || primary.reason === "offline") return primary;

    const key = (import.meta.env.VITE_WEB3FORMS_KEY || "").trim();
    if (key) {
      const backup = await postWeb3Forms(key, e);
      if (backup.ok) return backup;
    }
    // keep the primary's reason: it explains the situation best
    return primary;
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
