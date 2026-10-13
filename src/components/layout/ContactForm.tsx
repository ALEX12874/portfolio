import { useEffect, useId, useRef, useState, type FormEvent } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { LIMITS, enquiryText, mailtoFallback, sendEnquiry, type FailReason } from "../../lib/sendEnquiry";

type FieldName = "name" | "phone" | "email" | "message";
type Values = Record<FieldName, string>;
type Errors = Partial<Record<FieldName, string>>;
type Status = "idle" | "sending" | "success" | "error";

interface ContactFormProps {
  /** Direct address for the mailto: fallback and error copy. */
  email: string;
}

const EMPTY: Values = { name: "", phone: "", email: "", message: "" };
const ORDER: FieldName[] = ["name", "phone", "email", "message"];
// only after a successful send (the honeypot is the spam guard)
const COOLDOWN_MS = 10000;
const COOLDOWN_KEY = "contact:lastSentAt";
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validate(v: Values): Errors {
  const e: Errors = {};
  const name = v.name.trim();
  if (!name) e.name = "Please enter your name.";
  else if (name.length < 2) e.name = "Name looks too short.";

  const phone = v.phone.trim();
  // accept "+91 98765 43210", "(0141) 234-5678", "98765.43210" …
  const compact = phone.replace(/[\s\-().]/g, "");
  const digits = compact.replace(/\D/g, "").length;
  if (!phone) e.phone = "Please enter your phone number.";
  else if (!/^\+?\d+$/.test(compact)) e.phone = "Use digits, with an optional + at the start.";
  else if (digits < 7 || digits > 15) e.phone = "Phone number should have 7–15 digits.";

  const email = v.email.trim();
  if (!email) e.email = "Please enter your email address.";
  else if (!EMAIL_RE.test(email)) e.email = "That email address doesn't look right.";

  const msg = v.message.trim();
  if (!msg) e.message = "Please write a short message.";
  else if (msg.length < 10) e.message = "Message should be at least 10 characters.";
  else if (msg.length > LIMITS.message) e.message = `Message can be at most ${LIMITS.message} characters.`;

  return e;
}

function readLastSent(): number {
  try {
    return Number(window.sessionStorage.getItem(COOLDOWN_KEY)) || 0;
  } catch {
    return 0;
  }
}

function writeLastSent(t: number) {
  try {
    window.sessionStorage.setItem(COOLDOWN_KEY, String(t));
  } catch {
    /* storage unavailable — the in-memory cooldown still applies */
  }
}

/**
 * "Send a message" card. Real <form noValidate> with visible labels, inline
 * errors (aria-describedby / aria-invalid), focus on the first invalid field,
 * honeypot + minimum fill time + 30 s cooldown. Delivery is delegated to
 * sendEnquiry(), so the transport can change without touching this UI.
 */
export default function ContactForm({ email }: ContactFormProps) {
  const uid = useId();
  const [values, setValues] = useState<Values>(EMPTY);
  const [errors, setErrors] = useState<Errors>({});
  const [touched, setTouched] = useState<Partial<Record<FieldName, boolean>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [notice, setNotice] = useState("");
  const [failReason, setFailReason] = useState<FailReason>("network");
  const [failDetail, setFailDetail] = useState("");
  const [copied, setCopied] = useState(false);
  const [sentName, setSentName] = useState("");
  const [lastSentAt, setLastSentAt] = useState(0);
  const [now, setNow] = useState(() => Date.now());

  const honeypot = useRef<HTMLInputElement | null>(null);
  const fields = useRef<Partial<Record<FieldName, HTMLInputElement | HTMLTextAreaElement | null>>>({});
  const statusRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setLastSentAt(readLastSent());
  }, []);

  const cooldownLeft = Math.max(0, Math.ceil((lastSentAt + COOLDOWN_MS - now) / 1000));

  // tick only while a cooldown is running
  useEffect(() => {
    if (cooldownLeft <= 0) return undefined;
    const t = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(t);
  }, [cooldownLeft]);

  // move focus to the result so screen readers and keyboards land on it
  useEffect(() => {
    if (status === "success" || status === "error") statusRef.current?.focus();
  }, [status]);

  const id = (f: FieldName) => `${uid}-${f}`;
  const errId = (f: FieldName) => `${uid}-${f}-error`;

  const onChange = (f: FieldName, value: string) => {
    const next = { ...values, [f]: value };
    setValues(next);
    if (touched[f] || errors[f]) {
      const fieldErr = validate(next)[f];
      setErrors((cur) => ({ ...cur, [f]: fieldErr }));
    }
    if (status === "error") setStatus("idle");
    setNotice("");
  };

  const onBlur = (f: FieldName) => {
    setTouched((cur) => ({ ...cur, [f]: true }));
    if (values[f].trim()) setErrors((cur) => ({ ...cur, [f]: validate(values)[f] }));
  };

  const onSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (status === "sending") return;

    const found = validate(values);
    setErrors(found);
    setTouched({ name: true, phone: true, email: true, message: true });
    const firstBad = ORDER.find((f) => found[f]);
    if (firstBad) {
      fields.current[firstBad]?.focus();
      return;
    }

    const t = Date.now();
    setNow(t);
    if (lastSentAt && t - lastSentAt < COOLDOWN_MS) {
      setNotice(`Please wait ${Math.ceil((lastSentAt + COOLDOWN_MS - t) / 1000)}s before sending another message.`);
      return;
    }

    setNotice("");
    setStatus("sending");
    const result = await sendEnquiry({ ...values, botcheck: !!honeypot.current?.checked });
    if (result.ok) {
      const sent = Date.now();
      writeLastSent(sent);
      setLastSentAt(sent);
      setNow(sent);
      setSentName(values.name.trim().split(/\s+/)[0] ?? "");
      setStatus("success");
    } else {
      setFailReason(result.reason);
      setFailDetail(result.detail ?? "");
      setStatus("error");
    }
  };

  const copyMessage = async () => {
    try {
      await navigator.clipboard.writeText(enquiryText(values));
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const failCopy: Record<FailReason, string> = {
    config: "Couldn't send automatically — the form isn't connected yet.",
    offline: "You seem to be offline, so I couldn't send it.",
    timeout: "Couldn't send — the mail service took too long to answer.",
    rejected: `Couldn't send — the mail service said: ${failDetail || "request rejected"}.`,
    network: "Couldn't send automatically — the connection to the mail service failed.",
  };

  const sendAnother = () => {
    setValues(EMPTY);
    setErrors({});
    setTouched({});
    setNotice("");
    setStatus("idle");
    window.setTimeout(() => fields.current.name?.focus(), 0);
  };

  const inputBase =
    "block h-12 w-full rounded-xl border bg-white/70 px-3.5 text-base text-[#151515] placeholder:text-[rgba(21,21,21,0.38)] transition-[border-color,box-shadow] duration-200 focus:outline-none focus-visible:outline-none focus:ring-2 focus:ring-[#E63843] focus:ring-offset-0";
  const borderFor = (f: FieldName) =>
    errors[f] ? "border-[#E63843]" : "border-[rgba(21,21,21,0.12)] hover:border-[rgba(21,21,21,0.28)]";

  const label = (f: FieldName, text: string) => (
    <label htmlFor={id(f)} className="mb-1 block text-sm font-semibold text-[#151515]">
      {text}{" "}
      <span className="text-[#E63843]" aria-hidden="true">
        *
      </span>
      <span className="sr-only">(required)</span>
    </label>
  );

  const errorText = (f: FieldName) =>
    errors[f] ? (
      <p id={errId(f)} className="mt-1.5 text-sm font-medium text-[#C42530]">
        {errors[f]}
      </p>
    ) : null;

  const describedBy = (f: FieldName, extra?: string) =>
    [errors[f] ? errId(f) : "", extra ?? ""].filter(Boolean).join(" ") || undefined;

  return (
    <div className="relative mx-auto w-full max-w-[380px] rounded-[20px] bg-[#F5F0E8] p-5 text-[#151515] shadow-[0_24px_60px_rgba(0,0,0,0.4),0_2px_0_rgba(255,255,255,0.6)_inset] sm:p-6 lg:mx-0 lg:ml-auto lg:max-w-[420px]">
      {status === "success" ? (
        <div
          ref={statusRef}
          tabIndex={-1}
          role="status"
          aria-live="polite"
          className="flex min-h-[300px] flex-col items-start justify-center focus:outline-none"
        >
          <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-[#D8FF63] text-[#151515] shadow-[0_10px_30px_rgba(216,255,99,0.35)]">
            <Check size={28} strokeWidth={3} aria-hidden="true" />
          </span>
          <h3 className="mt-5 font-display text-[1.25rem] font-extrabold leading-tight">
            Message sent
          </h3>
          <p className="mt-3 max-w-md text-base leading-relaxed text-[rgba(21,21,21,0.78)]">
            Thanks{sentName ? `, ${sentName}` : ""} — your message is on its way. I&apos;ll get back to you soon.
          </p>
          <button
            type="button"
            onClick={sendAnother}
            className="mt-8 font-display text-sm font-bold uppercase tracking-[0.14em] text-[#151515] underline decoration-[#E63843] decoration-2 underline-offset-4 transition-colors hover:text-[#E63843] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E63843] focus-visible:ring-offset-4 focus-visible:ring-offset-[#F5F0E8]"
          >
            Send another
          </button>
        </div>
      ) : (
        <>
          <h3 className="font-display text-[1.25rem] font-extrabold leading-tight tracking-[-0.01em]">
            Send a message
          </h3>

          <form noValidate onSubmit={onSubmit} className="mt-4 space-y-2.5" aria-describedby={`${uid}-required`}>
            <p id={`${uid}-required`} className="sr-only">
              All fields are required.
            </p>

            {/* honeypot: off-screen, out of the tab order, hidden from AT */}
            <div aria-hidden="true" className="absolute left-[-10000px] top-auto h-px w-px overflow-hidden">
              <label htmlFor={`${uid}-botcheck`}>Leave this box unticked</label>
              <input ref={honeypot} id={`${uid}-botcheck`} type="checkbox" name="botcheck" tabIndex={-1} autoComplete="off" />
            </div>

            <div>
              {label("name", "Your name")}
              <input
                ref={(n) => {
                  fields.current.name = n;
                }}
                id={id("name")}
                name="name"
                type="text"
                autoComplete="name"
                maxLength={LIMITS.name}
                required
                aria-required="true"
                aria-invalid={!!errors.name}
                aria-describedby={describedBy("name")}
                value={values.name}
                onChange={(e) => onChange("name", e.target.value)}
                onBlur={() => onBlur("name")}
                className={`${inputBase} ${borderFor("name")}`}
              />
              {errorText("name")}
            </div>

            <div>
              {label("phone", "Phone number")}
              <input
                ref={(n) => {
                  fields.current.phone = n;
                }}
                id={id("phone")}
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                maxLength={LIMITS.phone}
                required
                aria-required="true"
                aria-invalid={!!errors.phone}
                aria-describedby={describedBy("phone")}
                value={values.phone}
                onChange={(e) => onChange("phone", e.target.value)}
                onBlur={() => onBlur("phone")}
                className={`${inputBase} ${borderFor("phone")}`}
              />
              {errorText("phone")}
            </div>

            <div>
              {label("email", "Email address")}
              <input
                ref={(n) => {
                  fields.current.email = n;
                }}
                id={id("email")}
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                maxLength={LIMITS.email}
                required
                aria-required="true"
                aria-invalid={!!errors.email}
                aria-describedby={describedBy("email")}
                value={values.email}
                onChange={(e) => onChange("email", e.target.value)}
                onBlur={() => onBlur("email")}
                className={`${inputBase} ${borderFor("email")}`}
              />
              {errorText("email")}
            </div>

            <div>
              {label("message", "Message")}
              <textarea
                ref={(n) => {
                  fields.current.message = n;
                }}
                id={id("message")}
                name="message"
                rows={3}
                maxLength={LIMITS.message}
                required
                aria-required="true"
                aria-invalid={!!errors.message}
                aria-describedby={describedBy("message", `${uid}-count`)}
                value={values.message}
                onChange={(e) => onChange("message", e.target.value)}
                onBlur={() => onBlur("message")}
                className={`${inputBase} ${borderFor("message")} h-auto min-h-[6rem] resize-y py-3 leading-relaxed`}
              />
              <div className="mt-1 flex items-start justify-between gap-4">
                <div className="min-w-0">{errorText("message")}</div>
                <p
                  id={`${uid}-count`}
                  className={`shrink-0 text-xs tabular-nums ${
                    values.message.length > LIMITS.message - 100 ? "text-[#C42530]" : "text-[rgba(21,21,21,0.5)]"
                  }`}
                >
                  {values.message.length} / {LIMITS.message}
                </p>
              </div>
            </div>

            {/* form-level messages */}
            <div ref={status === "error" ? statusRef : undefined} tabIndex={-1} aria-live="polite" className="focus:outline-none">
              {status === "error" ? (
                <div
                  role="alert"
                  className="rounded-xl border border-[rgba(230,56,67,0.35)] bg-[rgba(230,56,67,0.08)] px-4 py-3 text-sm font-medium leading-relaxed text-[#B3202B]"
                >
                  <p>{failCopy[failReason]} Your message is still here.</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <a
                      href={mailtoFallback(email, values)}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-full bg-[#151515] px-4 font-display text-[0.82rem] font-bold text-[#F5F0E8] hover:bg-[#E63843] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E63843] focus-visible:ring-offset-2"
                    >
                      Email me instead
                    </a>
                    <button
                      type="button"
                      onClick={copyMessage}
                      className="inline-flex min-h-[44px] items-center justify-center rounded-full border border-[rgba(21,21,21,0.25)] px-4 font-display text-[0.82rem] font-bold text-[#151515] hover:border-[#151515] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E63843] focus-visible:ring-offset-2"
                    >
                      {copied ? "Copied" : "Copy my message"}
                    </button>
                  </div>
                  <p className="mt-2 text-xs text-[rgba(21,21,21,0.6)]">
                    Or write to <span className="font-semibold">{email}</span>.
                  </p>
                </div>
              ) : notice ? (
                <p className="text-sm font-medium text-[rgba(21,21,21,0.75)]">{notice}</p>
              ) : cooldownLeft > 0 ? (
                <p className="text-sm text-[rgba(21,21,21,0.6)]">You can send another message in {cooldownLeft}s.</p>
              ) : null}
            </div>

            <button
              type="submit"
              disabled={status === "sending" || cooldownLeft > 0}
              aria-disabled={status === "sending" || cooldownLeft > 0}
              className="group inline-flex h-11 w-full items-center justify-center gap-3 rounded-full bg-[#151515] px-6 font-display text-[0.92rem] sm:w-auto font-bold text-[#F5F0E8] shadow-[0_10px_24px_rgba(21,21,21,0.25)] transition-[transform,box-shadow,background-color] duration-200 hover:shadow-[0_14px_30px_rgba(21,21,21,0.32)] active:translate-y-px active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#E63843] focus-visible:ring-offset-2 focus-visible:ring-offset-[#F5F0E8]"
            >
              {status === "sending" ? (
                <>
                  <Loader2 size={18} className="animate-spin" aria-hidden="true" />
                  <span>Sending…</span>
                </>
              ) : (
                <>
                  <span className="relative">
                    Submit Inquiry
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-1 left-0 h-[2px] w-full origin-left scale-x-0 bg-[#D8FF63] transition-transform duration-300 group-hover:scale-x-100 group-focus-visible:scale-x-100"
                    />
                  </span>
                  <ArrowRight
                    size={17}
                    aria-hidden="true"
                    className="transition-transform duration-300 group-hover:translate-x-0.5"
                  />
                </>
              )}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
