import { useContext } from "react";
import { m } from "framer-motion";
import { ArrowDownToLine, ArrowUpRight } from "lucide-react";
import { site } from "../../data/site";
import { assets, RESUME_FILENAME } from "../../data/assets";
import { scrollToSection } from "../../lib/scroll";
import MagneticButton from "./MagneticButton";
import SocialButton, { GitHubMark, LinkedInMark } from "./SocialButton";
import { StaticRender, hadShell, syncedDelay } from "../../lib/shell";

const EASE = [0.22, 1, 0.36, 1] as const;

const container = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const rise = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.75, ease: EASE } },
};

/** Splits the lead sentence, wrapping the three key phrases in markers. */
function withMarkers(text: string, keys: readonly string[]) {
  const nodes: React.ReactNode[] = [];
  let cursor = 0;
  keys.forEach((k, i) => {
    const at = text.indexOf(k, cursor);
    if (at < 0) return;
    if (at > cursor) nodes.push(text.slice(cursor, at));
    nodes.push(
      // in step with the static first screen's highlight, never replayed
      <mark className="marker is-lit" key={k} style={{ animationDelay: syncedDelay(900 + i * 140) }}>
        {k}
      </mark>
    );
    cursor = at + k.length;
  });
  nodes.push(text.slice(cursor));
  return nodes;
}

export default function HeroText() {
  // the first screen is already painted (static HTML, or the static copy
  // React is taking over from): show the copy as it is, no entrance replay
  const instant = useContext(StaticRender) || hadShell;
  return (
    <m.div
      variants={container}
      initial={instant ? false : "hidden"}
      animate="show"
      className="hero-copy relative z-10 max-w-[46rem]"
    >
      <m.p variants={rise} className="eyebrow text-[#E63843]">
        {site.eyebrow}
      </m.p>

      <m.h1
        variants={rise}
        id="home-heading"
        className="display mt-7 text-[length:var(--size-hero)] leading-[0.9]"
      >
        <span className="block text-[#151515]">{site.firstName}</span>
        <span className="block text-[#E63843]">{site.lastName}</span>
      </m.h1>

      <m.div variants={rise} className="mt-8 max-w-[38rem]">
        <p className="text-[clamp(1.05rem,1.5vw,1.3rem)] leading-relaxed text-[rgba(21,21,21,0.72)]">
          {withMarkers(site.introLead, site.introLeadHighlights)}
        </p>
        <p className="mt-5 text-[clamp(1rem,1.2vw,1.12rem)] font-semibold leading-relaxed text-[#151515]">
          {site.introBold}
        </p>
        <p className="mt-4 text-[clamp(1rem,1.1vw,1.05rem)] leading-relaxed text-[rgba(21,21,21,0.6)]">
          {site.introLight}
        </p>
      </m.div>

      <m.div
        variants={rise}
        className="mt-9 flex flex-wrap items-center gap-3 pb-[env(safe-area-inset-bottom)] sm:mt-10 sm:gap-5"
      >
        <div className="flex items-center gap-2">
          <MagneticButton
            href={assets.resume}
            newTab
            ariaLabel="Get Resume — opens in a new tab"
            className="shrink-0"
          >
            Get Resume
            <ArrowUpRight size={17} aria-hidden="true" />
          </MagneticButton>

          <a
            href={assets.resume}
            download={RESUME_FILENAME}
            aria-label="Download résumé"
            className="icon-circle !h-[52px] !w-[52px]"
            title="Download résumé"
          >
            <ArrowDownToLine size={19} aria-hidden="true" />
          </a>
        </div>

        <button
          type="button"
          onClick={() => scrollToSection("projects")}
          className="group order-last inline-flex min-h-[48px] w-full items-center justify-center gap-2 rounded-full border border-[rgba(21,21,21,0.2)] px-5 py-3 font-display text-[0.95rem] font-bold uppercase tracking-[0.08em] text-[#151515] transition-colors duration-300 hover:text-[#E63843] active:bg-[rgba(21,21,21,0.05)] sm:order-none sm:w-auto sm:justify-start sm:border-0 sm:px-1"
        >
          Explore My Work
          <span
            aria-hidden="true"
            className="inline-block transition-transform duration-400 ease-editorial group-hover:translate-x-1 group-hover:-translate-y-1"
          >
            ↗
          </span>
        </button>

        <div className="flex items-center gap-3">
          <SocialButton href={site.linkedin} label="LinkedIn">
            <LinkedInMark size={19} />
          </SocialButton>
          {site.github ? (
            <SocialButton href={site.github} label="GitHub">
              <GitHubMark size={19} />
            </SocialButton>
          ) : null}
        </div>
      </m.div>
    </m.div>
  );
}
