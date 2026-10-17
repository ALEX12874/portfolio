import { m } from "framer-motion";
import { ArrowLeft, ArrowRight } from "lucide-react";
import type { Project } from "../../data/projects";
import ProjectCTA from "./ProjectCTA";

const EASE = [0.22, 1, 0.36, 1] as const;

interface ProjectDetailsProps {
  project: Project;
  onPrev: () => void;
  onNext: () => void;
  onOpenCaseStudy: () => void;
}

/**
 * Layer C — information only (never inside the stage): name, category,
 * description, "My contribution", CTA and prev/next controls.
 */
export default function ProjectDetails({
  project,
  onPrev,
  onNext,
  onOpenCaseStudy,
}: ProjectDetailsProps) {
  return (
    <m.div
      key={project.id}
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.55, delay: 0.28, ease: EASE }}
      className="relative flex h-full flex-col rounded-xl border border-[var(--proj-line)] bg-[var(--proj-panel)] p-[1.0625rem] sm:p-8"
    >
      <p className="font-display text-[0.7rem] font-bold uppercase tracking-[0.22em] text-[var(--proj-accent)]">
        {project.number} / {project.name}
      </p>

      <p className="mt-3 font-display text-[0.78rem] font-bold uppercase tracking-[0.14em] text-[var(--proj-text-3)]">
        {project.category}
      </p>

      <div className="mt-5 pr-1">
        <p className="text-[0.95rem] leading-relaxed text-[var(--proj-text-2)]">
          {project.description}
        </p>

        {project.contribution ? (
          <div className="mt-6 border-t border-[var(--proj-line)] pt-5">
            <h3 className="font-display text-[0.72rem] font-bold uppercase tracking-[0.22em] text-[var(--proj-accent)]">
              My contribution
            </h3>
            <p className="mt-3 text-[0.92rem] leading-relaxed text-[var(--proj-text-2)]">
              {project.contribution}
            </p>
            {project.contributionNote ? (
              <p className="mt-2 text-[0.78rem] italic text-[var(--proj-text-4)]">
                {project.contributionNote}
              </p>
            ) : null}
          </div>
        ) : null}
      </div>

      <div className="mt-7 flex flex-wrap items-center gap-4">
        <ProjectCTA
          cta={project.cta}
          accent={project.theme.accent}
          onOpenCaseStudy={onOpenCaseStudy}
        />

        <div className="ml-auto flex items-center gap-2">
          <button
            type="button"
            onClick={onPrev}
            aria-label="Previous project"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--proj-line-2)] text-[var(--proj-text)] transition-colors duration-300 hover:border-[var(--proj-accent)] hover:bg-[var(--proj-accent)] hover:text-[var(--proj-on-accent)]"
          >
            <ArrowLeft size={17} aria-hidden="true" />
          </button>
          <button
            type="button"
            onClick={onNext}
            aria-label="Next project"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-[var(--proj-line-2)] text-[var(--proj-text)] transition-colors duration-300 hover:border-[var(--proj-accent)] hover:bg-[var(--proj-accent)] hover:text-[var(--proj-on-accent)]"
          >
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </div>
      </div>
    </m.div>
  );
}
