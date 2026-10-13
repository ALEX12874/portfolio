import { motion } from "framer-motion";
import { ArrowDownToLine, ArrowUpRight } from "lucide-react";
import { site } from "../../data/site";
import { assets, RESUME_FILENAME } from "../../data/assets";
import { scrollToSection } from "../../lib/scroll";
import MagneticButton from "./MagneticButton";
import SocialButton, { GitHubMark, LinkedInMark } from "./SocialButton";

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
      <mark className="marker is-lit" key={k} style={{ animationDelay: `${900 + i * 140}ms` }}>
        {k}
      </mark>
    );
    cursor = at + k.length;
  });
  nodes.push(text.slice(cursor));
  return nodes;
}

export default function HeroText() {
  return (
    <motion.div
      variants={container}
      initial="hidden"
      animate="show"
      className="hero-copy relative z-10 max-w-[46rem]"
    >
      <motion.p variants={rise} className="eyebrow text-[#E63843]">
        {site.eyebrow}
      </motion.p>

      <motion.h1
        variants={rise}
        id="home-heading"
        className="display mt-7 text-[length:var(--size-hero)] leading-[0.9]"
      >
        <span className="block text-[#151515]">{site.firstName}</span>
        <span className="block text-[#E63843]">{site.lastName}</span>
      </motion.h1>

      <motion.div variants={rise} className="mt-8 max-w-[38rem]">
        <p className="text-[clamp(1.05rem,1.5vw,1.3rem)] leading-relaxed text-[rgba(21,21,21,0.72)]">
          {withMarkers(site.introLead, site.introLeadHighlights)}
        </p>
        <p className="mt-5 text-[clamp(1rem,1.2vw,1.12rem)] font-semibold leading-relaxed text-[#151515]">
          {site.introBold}
        </p>
        <p className="mt-4 text-[clamp(0.95rem,1.1vw,1.05rem)] leading-relaxed text-[rgba(21,21,21,0.55)]">
          {site.introLight}
        </p>
      </motion.div>

      <motion.div
        variants={rise}
        className="mt-10 flex flex-wrap items-center gap-4 sm:gap-5"
      >
        <div className="flex items-center gap-2">
          <MagneticButton
            href={assets.resume}
            newTab
            ariaLabel="Get résumé — opens in a new tab"
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
          className="group inline-flex items-center gap-2 px-1 py-3 font-display text-[0.95rem] font-bold uppercase tracking-[0.08em] text-[#151515] transition-colors duration-300 hover:text-[#E63843]"
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
      </motion.div>
    </motion.div>
  );
}
