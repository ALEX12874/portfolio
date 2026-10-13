/**
 * Contact-form delivery. The UI only ever calls `sendEnquiry()`; to move to
 * a Vercel serverless route later, replace `postWeb3Forms()` / the provider
 * list below and leave the form untouched.
 *
 * Primary transport: Web3Forms (https://web3forms.com). Its access key is a
 * public, per-inbox key by design — read from VITE_WEB3FORMS_KEY at BUILD
 * time (Vite bakes VITE_* in), never hard-coded. Optional backup:
 * Formspree, enabled only when VITE_FORMSPREE_ID is set.
 */

export interface Enquiry {
  name: string;
  phone: string;
  email: string;
  message: string;
  /** Honeypot — real users never tick it. */
  botcheck?: boolean;
}

export type FailReason = "config" | "offline" | "timeout" | "rejected" | "network";

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

/** True when the build has no Web3Forms key (the form can't auto-send). */
export const SEND_CONFIGURED = Boolean(
  (import.meta.env.VITE_WEB3FORMS_KEY || "").trim() || (import.meta.env.VITE_FORMSPREE_ID || "").trim()
);

let warnedMissingKey = false;

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

interface Attempt {
  result: SendResult;
  /** Worth one automatic retry (network error / 5xx / timeout). */
  retryable: boolean;
}

/** One POST with a hard timeout; never throws. */
async function postJson(url: string, body: unknown, readOk: (data: unknown, res: Response) => boolean): Promise<Attempt> {
  if (typeof navigator !== "undefined" && navigator.onLine === false) {
    return { result: { ok: false, reason: "offline" }, retryable: false };
  }
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data: unknown = await res.json().catch(() => null);
    if (readOk(data, res)) return { result: { ok: true }, retryable: false };
    const message =
      data && typeof data === "object" && "message" in data && typeof (data as { message: unknown }).message === "string"
        ? (data as { message: string }).message
        : `HTTP ${res.status}`;
    return { result: { ok: false, reason: "rejected", detail: message }, retryable: res.status >= 500 };
  } catch (err) {
    const aborted = err instanceof DOMException && err.name === "AbortError";
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      return { result: { ok: false, reason: "offline" }, retryable: false };
    }
    return { result: { ok: false, reason: aborted ? "timeout" : "network" }, retryable: true };
  } finally {
    window.clearTimeout(timer);
  }
}

/** Run an attempt, retrying once (after 1.5 s) on network errors / 5xx. */
async function withRetry(run: () => Promise<Attempt>): Promise<SendResult> {
  const first = await run();
  if (first.result.ok || !first.retryable) return first.result;
  await wait(RETRY_DELAY_MS);
  return (await run()).result;
}

function web3formsBody(key: string, e: Enquiry) {
  return {
    access_key: key,
    subject: `New portfolio enquiry from ${e.name}`,
    from_name: "Portfolio Website",
    name: e.name,
    phone: e.phone,
    email: e.email,
    replyto: e.email,
    message: e.message,
    botcheck: false,
  };
}

/** Web3Forms: success only when the HTTP status is OK *and* data.success is true. */
async function postWeb3Forms(key: string, e: Enquiry): Promise<SendResult> {
  return withRetry(() =>
    postJson(WEB3FORMS_URL, web3formsBody(key, e), (data, res) =>
      Boolean(res.ok && data && typeof data === "object" && (data as { success?: unknown }).success === true)
    )
  );
}

/** Optional backup provider (only when VITE_FORMSPREE_ID is set). */
async function postFormspree(id: string, e: Enquiry): Promise<SendResult> {
  return withRetry(() =>
    postJson(
      `https://formspree.io/f/${encodeURIComponent(id)}`,
      {
        name: e.name,
        phone: e.phone,
        email: e.email,
        message: e.message,
        _subject: `New portfolio enquiry from ${e.name}`,
        _replyto: e.email,
      },
      (data, res) => res.ok && !(data && typeof data === "object" && "errors" in data)
    )
  );
}

/**
 * Send one enquiry. Inputs are trimmed and sanitised first; a ticked
 * honeypot short-circuits to a silent "success" so bots learn nothing.
 * Always resolves (never throws), so the UI can never get stuck.
 */
export async function sendEnquiry(input: Enquiry): Promise<SendResult> {
  const e = sanitize(input);
  if (e.botcheck) return { ok: true };

  const key = (import.meta.env.VITE_WEB3FORMS_KEY || "").trim();
  const formspree = (import.meta.env.VITE_FORMSPREE_ID || "").trim();

  if (!key && !formspree) {
    if (!warnedMissingKey) {
      warnedMissingKey = true;
      // dev console only (production builds strip console.*); the build itself
      // prints a loud warning when the key is missing (vite.config.ts)
      console.warn("[contact] VITE_WEB3FORMS_KEY was not set when this site was built — the form can't auto-send.");
    }
    return { ok: false, reason: "config" };
  }

  try {
    let result: SendResult = { ok: false, reason: "config" };
    if (key) result = await postWeb3Forms(key, e);
    if (!result.ok && formspree) {
      const backup = await postFormspree(formspree, e);
      if (backup.ok) return backup;
      // keep the more informative primary reason when there was one
      if (!key) result = backup;
    }
    return result;
  } catch {
    return { ok: false, reason: "network" };
  }
}

/** mailto: fallback pre-filled with the visitor's name, phone and message. */
export function mailtoFallback(to: string, e: Pick<Enquiry, "name" | "phone" | "message">): string {
  const name = clean(e.name, LIMITS.name);
  const phone = clean(e.phone, LIMITS.phone);
  const subject = `New portfolio enquiry from ${name || "your website"}`;
  const body = [clean(e.message, LIMITS.message, true), "", name ? `— ${name}` : "", phone ? `Phone: ${phone}` : ""]
    .filter((l, i, a) => l || (i > 0 && a[i - 1]))
    .join("\n")
    .trim();
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

/** Plain-text copy of the enquiry for the "Copy my message" fallback. */
export function enquiryText(e: Pick<Enquiry, "name" | "phone" | "email" | "message">): string {
  return [
    `Name: ${clean(e.name, LIMITS.name)}`,
    `Phone: ${clean(e.phone, LIMITS.phone)}`,
    `Email: ${clean(e.email, LIMITS.email)}`,
    "",
    clean(e.message, LIMITS.message, true),
  ].join("\n");
}
