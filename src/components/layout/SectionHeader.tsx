import { m } from "framer-motion";
import { useReveal } from "../../hooks/useReveal";

interface SectionHeaderProps {
  id: string;
  eyebrow: string;
  title: string;
  copy?: string;
  hint?: string;
  tone?: "ink" | "ivory";
}

const rise = {
  hidden: { opacity: 0, y: 26 },
  show: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.08, ease: [0.22, 1, 0.36, 1] },
  }),
};

export default function SectionHeader({
  id,
  eyebrow,
  title,
  copy,
  hint,
  tone = "ivory",
}: SectionHeaderProps) {
  const accent = tone === "ivory" ? "text-[#E63843]" : "text-[#E63843]";
  const copyTone =
    tone === "ivory" ? "text-[rgba(245,240,232,0.7)]" : "text-[rgba(21,21,21,0.7)]";

  // one trigger for the whole header (with a never-stay-hidden safety net)
  const { ref, shown } = useReveal<HTMLElement>();
  const state = shown ? "show" : "hidden";

  return (
    <header ref={ref} className="relative z-10 max-w-4xl">
      <m.p
        custom={0}
        variants={rise}
        initial="hidden"
        animate={state}
        className={`eyebrow ${accent}`}
      >
        {eyebrow}
      </m.p>

      <m.h2
        id={`${id}-heading`}
        custom={1}
        variants={rise}
        initial="hidden"
        animate={state}
        className="display h2 mt-6"
      >
        {title}
      </m.h2>

      {copy ? (
        <m.p
          custom={2}
          variants={rise}
          initial="hidden"
        animate={state}
          className={`mt-6 max-w-2xl text-[1.05rem] leading-relaxed ${copyTone}`}
        >
          {copy}
        </m.p>
      ) : null}

      {hint ? (
        <m.p
          custom={3}
          variants={rise}
          initial="hidden"
        animate={state}
          className="mt-7 inline-flex items-center gap-3 font-display text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[rgba(245,240,232,0.65)]"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-[#D8FF63]" aria-hidden="true" />
          {hint}
        </m.p>
      ) : null}
    </header>
  );
}
