import { useEffect, useRef, useState } from "react";
import { ArrowUp, Linkedin, Mail, MapPin } from "lucide-react";
import { site } from "../../data/site";
import { scrollToSection } from "../../lib/scroll";
import DottedBackground from "./DottedBackground";
import ContactForm from "./ContactForm";

const rowLabel =
  "font-display text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[rgba(245,240,232,0.5)]";

/**
 * Contact + footer. Two columns on desktop (details ≈ 45% | form), stacked
 * on mobile with the details first. Bottom bar: copyright + back to top.
 */
export default function Footer() {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(resetTimer.current), []);

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(site.email);
      setCopied(true);
      window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  return (
    <footer
      id="contact"
      aria-labelledby="contact-heading"
      className="on-ink relative overflow-hidden bg-[#151515] text-[#F5F0E8]"
    >
      <DottedBackground tone="ink" />
      <div className="absolute inset-x-0 top-0 h-px bg-[rgba(245,240,232,0.18)]" aria-hidden="true" />

      <div className="relative mx-auto w-full max-w-[1600px] px-5 pb-[max(2rem,env(safe-area-inset-bottom))] pt-16 sm:px-8 sm:pt-24 lg:px-12 lg:pt-32">
        <div className="grid gap-10 lg:grid-cols-[minmax(0,45fr)_minmax(0,55fr)] lg:gap-16 xl:gap-24">
          {/* ---- details ---- */}
          <div>
            <p className="eyebrow text-[#E63843]">GET IN TOUCH</p>

            <h2 id="contact-heading" className="display mt-6 text-[clamp(3rem,15vw,6rem)] leading-[0.9] lg:text-[min(6.4vw,6.6rem)]">
              <span className="block">{site.firstName}</span>
              <span className="block text-[#E63843]">{site.lastName}</span>
            </h2>

            <p className="mt-5 font-display text-base font-bold uppercase tracking-[0.08em] text-[rgba(245,240,232,0.85)] sm:text-lg">
              {site.roleLine}
            </p>

            <dl className="mt-8 divide-y divide-[rgba(245,240,232,0.12)] border-y border-[rgba(245,240,232,0.12)]">
              <div className="py-4 sm:py-6">
                <dt className={rowLabel}>Location</dt>
                <dd className="mt-3 inline-flex items-center gap-2.5 text-lg">
                  <MapPin size={18} aria-hidden="true" className="text-[#D8FF63]" />
                  {site.location}
                </dd>
              </div>

              <div className="py-4 sm:py-6">
                <dt className={rowLabel}>Email</dt>
                <dd className="mt-3 flex flex-wrap items-center gap-3">
                  <a
                    href={`mailto:${site.email}`}
                    className="inline-flex min-w-0 items-center gap-2.5 break-all text-lg underline decoration-[#E63843] decoration-2 underline-offset-[6px] transition-colors duration-300 hover:text-[#D8FF63]"
                  >
                    <Mail size={18} aria-hidden="true" className="shrink-0" />
                    {site.email}
                  </a>
                  <button
                    type="button"
                    onClick={copyEmail}
                    className={`rounded-full border px-3 py-1 font-display text-[0.68rem] font-bold uppercase tracking-[0.18em] transition-colors duration-300 ${
                      copied
                        ? "border-[#D8FF63] text-[#D8FF63]"
                        : "border-[rgba(245,240,232,0.3)] hover:border-[#D8FF63] hover:text-[#D8FF63]"
                    }`}
                    aria-label={copied ? "Email address copied" : "Copy email address to clipboard"}
                  >
                    {copied ? "Copied" : "Copy"}
                  </button>
                  <span role="status" aria-live="polite" className="sr-only">
                    {copied ? "Email address copied to clipboard" : ""}
                  </span>
                </dd>
              </div>

              <div className="py-4 sm:py-6">
                <dt className={rowLabel}>Elsewhere</dt>
                <dd className="mt-3">
                  <a
                    href={site.linkedin}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Gourang Lokwani on LinkedIn"
                    className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(245,240,232,0.3)] transition-all duration-300 ease-editorial hover:-translate-y-0.5 hover:border-[#D8FF63] hover:bg-[#D8FF63] hover:text-[#151515]"
                  >
                    <Linkedin size={18} aria-hidden="true" />
                  </a>
                </dd>
              </div>
            </dl>
          </div>

          {/* ---- form ---- */}
          <div className="lg:pt-2">
            <ContactForm email={site.email} />
          </div>
        </div>

        {/* ---- bottom bar ---- */}
        <div className="mt-12 flex flex-col items-start justify-between gap-6 border-t border-[rgba(245,240,232,0.15)] pt-8 sm:flex-row sm:items-center lg:mt-20">
          <p className="text-sm text-[rgba(245,240,232,0.6)]">{site.copyright}</p>

          <button
            type="button"
            onClick={() => scrollToSection("home")}
            className="group inline-flex items-center gap-2 rounded-full border border-[rgba(245,240,232,0.3)] px-5 py-2.5 font-display text-[0.7rem] font-bold uppercase tracking-[0.2em] transition-all duration-400 ease-editorial hover:border-[#E63843] hover:bg-[#E63843] hover:text-[#F5F0E8]"
            aria-label="Back to top"
          >
            <ArrowUp
              size={15}
              aria-hidden="true"
              className="transition-transform duration-400 ease-editorial group-hover:-translate-y-0.5"
            />
            Back to top
          </button>
        </div>
      </div>
    </footer>
  );
}
