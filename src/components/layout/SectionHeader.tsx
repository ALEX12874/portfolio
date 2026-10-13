import { motion } from "framer-motion";

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

  return (
    <header className="relative z-10 max-w-4xl">
      <motion.p
        custom={0}
        variants={rise}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.6 }}
        className={`eyebrow ${accent}`}
      >
        {eyebrow}
      </motion.p>

      <motion.h2
        id={`${id}-heading`}
        custom={1}
        variants={rise}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, amount: 0.5 }}
        className="display h2 mt-6"
      >
        {title}
      </motion.h2>

      {copy ? (
        <motion.p
          custom={2}
          variants={rise}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.5 }}
          className={`mt-6 max-w-2xl text-[1.05rem] leading-relaxed ${copyTone}`}
        >
          {copy}
        </motion.p>
      ) : null}

      {hint ? (
        <motion.p
          custom={3}
          variants={rise}
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.6 }}
          className="mt-7 inline-flex items-center gap-3 font-display text-[0.7rem] font-bold uppercase tracking-[0.24em] text-[rgba(245,240,232,0.65)]"
        >
          <span className="inline-block h-2 w-2 rounded-full bg-[#D8FF63]" aria-hidden="true" />
          {hint}
        </motion.p>
      ) : null}
    </header>
  );
}
