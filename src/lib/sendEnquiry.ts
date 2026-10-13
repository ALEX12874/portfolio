/**
 * Contact-form delivery. The UI only ever calls `sendEnquiry()`; to move to
 * a Vercel serverless route later, replace `deliver()` below and leave the
 * form untouched.
 *
 * Current transport: Web3Forms (https://web3forms.com). Its access key is a
 * public, per-inbox key by design — it is read from VITE_WEB3FORMS_KEY at
 * build time and never hard-coded here.
 */

export interface Enquiry {
  name: string;
  phone: string;
  email: string;
  message: string;
  /** Honeypot — real users never tick it. */
  botcheck?: boolean;
}

export type SendResult =
  | { ok: true }
  | { ok: false; reason: "config" | "network" | "rejected" };

const ENDPOINT = "https://api.web3forms.com/submit";
const TIMEOUT_MS = 15000;

export const LIMITS = {
  name: 80,
  phone: 24,
  email: 254,
  message: 2000,
} as const;

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

/** Web3Forms transport. Swap this function to change providers. */
async function deliver(e: Enquiry): Promise<SendResult> {
  const key = import.meta.env.VITE_WEB3FORMS_KEY;
  if (!key) {
    if (import.meta.env.DEV && !warnedMissingKey) {
      warnedMissingKey = true;
      console.warn(
        "[contact] VITE_WEB3FORMS_KEY is not set — enquiries cannot be sent. Add it to .env.local (see .env.example)."
      );
    }
    return { ok: false, reason: "config" };
  }

  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        access_key: key,
        subject: `New portfolio enquiry from ${e.name}`,
        from_name: "Portfolio Website",
        name: e.name,
        phone: e.phone,
        email: e.email,
        replyto: e.email,
        message: e.message,
        botcheck: false,
      }),
      signal: controller.signal,
    });
    const data = (await res.json().catch(() => null)) as { success?: boolean } | null;
    if (res.ok && data?.success) return { ok: true };
    if (import.meta.env.DEV) console.warn("[contact] provider rejected the enquiry (status", res.status, ")");
    return { ok: false, reason: "rejected" };
  } catch {
    // no user data in logs — only the fact that it failed
    if (import.meta.env.DEV) console.warn("[contact] network error while sending the enquiry");
    return { ok: false, reason: "network" };
  } finally {
    window.clearTimeout(timer);
  }
}

/**
 * Send one enquiry. Inputs are trimmed and sanitised first; a ticked
 * honeypot short-circuits to a silent "success" so bots learn nothing.
 */
export async function sendEnquiry(input: Enquiry): Promise<SendResult> {
  const e = sanitize(input);
  if (e.botcheck) return { ok: true };
  return deliver(e);
}

/** mailto: fallback with the subject and message pre-filled. */
export function mailtoFallback(to: string, e: Pick<Enquiry, "name" | "message">): string {
  const name = clean(e.name, LIMITS.name);
  const subject = `New portfolio enquiry from ${name || "your website"}`;
  const body = clean(e.message, LIMITS.message, true);
  return `mailto:${to}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}
