import { useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import SectionHeader from "../layout/SectionHeader";
import ExperienceList from "./ExperienceList";
import ExperienceDetailPanel from "./ExperienceDetailPanel";
import { experiences } from "../../data/experience";
import type { Experience } from "../../data/experience";
import { sectionHeadings } from "../../data/site";

/**
 * 04 / EXPERIENCE — editorial rows; clicking one opens the detail drawer.
 * Focus returns to the originating row when the drawer closes.
 */
export default function ExperienceSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const triggerRef = useRef<HTMLElement | null>(null);
  const copy = sectionHeadings.experience;

  const open = (experience: Experience, trigger: HTMLElement) => {
    const index = experiences.findIndex((e) => e.id === experience.id);
    triggerRef.current = trigger;
    setOpenIndex(index);
  };

  const close = () => {
    setOpenIndex(null);
    const trigger = triggerRef.current;
    window.setTimeout(() => trigger?.focus(), 60);
  };

  const current = openIndex !== null ? experiences[openIndex] : null;
  const step = (delta: number) => {
    if (openIndex === null) return;
    const next = (openIndex + delta + experiences.length) % experiences.length;
    setOpenIndex(next);
  };

  return (
    <section
      id="experience"
      aria-labelledby="experience-heading"
      className="on-ink relative bg-[#151515] text-[#F5F0E8]"
    >
      <div className="relative mx-auto w-full max-w-[1600px] px-5 pb-[4.5rem] pt-[5.25rem] sm:px-8 sm:pb-24 sm:pt-28 lg:px-12 lg:pt-32">
        <SectionHeader
          id="experience"
          eyebrow={copy.eyebrow}
          title={copy.title}
          copy={copy.copy}
          tone="ivory"
        />

        <ExperienceList onOpen={open} />
      </div>

      <AnimatePresence>
        {current ? (
          <ExperienceDetailPanel
            key={current.id}
            experience={current}
            index={openIndex as number}
            total={experiences.length}
            onClose={close}
            onPrev={() => step(-1)}
            onNext={() => step(1)}
          />
        ) : null}
      </AnimatePresence>
    </section>
  );
}
