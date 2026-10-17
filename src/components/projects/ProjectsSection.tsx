import { useEffect, useRef, useState } from "react";
import type { CSSProperties, TouchEvent } from "react";
import { m } from "framer-motion";
import DottedBackground from "../layout/DottedBackground";
import SectionHeader from "../layout/SectionHeader";
import ProjectSelector from "./ProjectSelector";
import ProjectDetails from "./ProjectDetails";
import ProjectTransition from "./ProjectTransition";
import BrandEnvironment from "./BrandEnvironment";
import WrepdCaseStudy from "./WrepdCaseStudy";
import { projects, defaultProjectId } from "../../data/projects";
import type { ProjectId } from "../../data/projects";
import { sectionHeadings } from "../../data/site";
import { useActiveInView } from "../../hooks/useInView";
import { decodedOrTimeout, preloadProjectLogos, whenIdle } from "../../lib/prefetch";

const EASE = [0.22, 1, 0.36, 1] as const;

/**
 * 03 / PROJECTS — an immersive selector where the stage atmosphere transforms
 * per project. Colours live in CSS variables scoped to this section only.
 */
/** Relative luminance of a #rrggbb colour (0 = black, 1 = white). */
function luminance(hex: string): number {
  const h = hex.replace("#", "");
  const lin = (i: number) => {
    const c = parseInt(h.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  };
  return 0.2126 * lin(0) + 0.7152 * lin(2) + 0.0722 * lin(4);
}

export default function ProjectsSection() {
  const [activeId, setActiveId] = useState<ProjectId>(defaultProjectId);
  const [caseStudyOpen, setCaseStudyOpen] = useState(false);
  const returnFocusRef = useRef<HTMLElement | null>(null);
  const touchStart = useRef<{ x: number; y: number } | null>(null);
  const { ref, active } = useActiveInView<HTMLElement>(0.04);

  const project = projects.find((p) => p.id === activeId) ?? projects[0];
  const index = projects.indexOf(project);

  // all four logos are decoded as soon as the section is around
  useEffect(() => whenIdle(preloadProjectLogos, 600), []);

  // switch only once the next logo is decoded (≤ 160 ms wait), so the new
  // world never shows a blank frame; the latest request wins
  const pending = useRef(0);
  const select = (id: ProjectId) => {
    const next = projects.find((p) => p.id === id);
    if (!next || id === activeId) return;
    const token = ++pending.current;
    void decodedOrTimeout(next.logo).then(() => {
      if (token === pending.current) setActiveId(id);
    });
  };

  const go = (delta: number) => {
    const next = (index + delta + projects.length) % projects.length;
    select(projects[next].id);
  };

  const openCaseStudy = () => {
    returnFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    setCaseStudyOpen(true);
  };

  const closeCaseStudy = () => {
    setCaseStudyOpen(false);
    returnFocusRef.current?.focus?.();
  };

  const onTouchStart = (e: TouchEvent) => {
    const t = e.touches[0];
    touchStart.current = { x: t.clientX, y: t.clientY };
  };

  const onTouchEnd = (e: TouchEvent) => {
    const start = touchStart.current;
    touchStart.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 48 || Math.abs(dx) < Math.abs(dy)) return;
    go(dx < 0 ? 1 : -1);
  };

  // light worlds (Inayat) get ink text; dark worlds keep ivory — every tint
  // below is a CSS variable, so switching worlds never leaves stale colours
  const light = luminance(project.theme.bg) > 0.5;
  useEffect(() => {
    window.dispatchEvent(new Event("section-tone"));
  }, [light]);
  const themeStyle = {
    "--proj-bg": project.theme.bg,
    "--proj-fg": project.theme.fg,
    "--proj-accent": project.theme.accent,
    "--proj-on-accent": luminance(project.theme.accent) > 0.35 ? "#151515" : "#F5F0E8",
    "--proj-text": light ? "#151515" : "#F5F0E8",
    "--proj-text-2": light ? "rgba(21,21,21,0.86)" : "rgba(245,240,232,0.86)",
    "--proj-text-3": light ? "rgba(21,21,21,0.72)" : "rgba(245,240,232,0.65)",
    "--proj-text-4": light ? "rgba(21,21,21,0.6)" : "rgba(245,240,232,0.5)",
    "--proj-line": light ? "rgba(21,21,21,0.14)" : "rgba(245,240,232,0.14)",
    "--proj-line-2": light ? "rgba(21,21,21,0.25)" : "rgba(245,240,232,0.25)",
    "--proj-panel": light ? "rgba(255,255,255,0.55)" : "rgba(21,21,21,0.6)",
  } as CSSProperties;

  return (
    <section
      id="projects"
      ref={ref}
      aria-labelledby="projects-heading"
      className={`relative overflow-hidden text-[var(--proj-text)] ${light ? "" : "on-ink"}`}
      style={themeStyle}
      data-tone={light ? "light" : "dark"}
    >
      {/* atmosphere — animates between any two projects */}
      <m.div
        aria-hidden="true"
        className="absolute inset-0"
        initial={false}
        animate={{ backgroundColor: project.theme.bg }}
        transition={{ duration: 0.8, ease: EASE }}
      />
      <DottedBackground tone={light ? "ivory" : "ink"} />

      <div className="relative mx-auto w-full max-w-[1600px] px-5 pb-[4.5rem] pt-[5.25rem] sm:px-8 sm:pb-24 sm:pt-28 lg:px-12 lg:pt-32">
        <SectionHeader
          id="projects"
          eyebrow={sectionHeadings.projects.eyebrow}
          title={sectionHeadings.projects.title}
          copy={sectionHeadings.projects.copy}
          tone={light ? "ink" : "ivory"}
        />

        <div className="mt-10 lg:mt-14">
          <ProjectSelector activeId={activeId} onSelect={select} />
        </div>

        <div className="mt-8 grid gap-6 lg:mt-10 lg:grid-cols-[1.08fr_0.92fr] lg:gap-8">
          <div
            className="relative aspect-[4/3] w-full overflow-hidden rounded-xl border border-[var(--proj-line)] shadow-[0_30px_90px_rgba(0,0,0,0.35)]"
            role="group"
            aria-label={`Project stage: ${project.name}. Use arrow keys or swipe to change project.`}
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "ArrowRight") {
                e.preventDefault();
                go(1);
              } else if (e.key === "ArrowLeft") {
                e.preventDefault();
                go(-1);
              }
            }}
            onTouchStart={onTouchStart}
            onTouchEnd={onTouchEnd}
          >
            <ProjectTransition theme={project.theme} projectId={project.id}>
              <BrandEnvironment project={project} />
            </ProjectTransition>

            <p className="pointer-events-none absolute bottom-3 left-4 font-display text-[0.6rem] font-bold uppercase tracking-[0.26em] text-[var(--proj-text-4)]">
              {`WORLD ${project.number} / 04`}
            </p>
          </div>

          <ProjectDetails
            project={project}
            onPrev={() => go(-1)}
            onNext={() => go(1)}
            onOpenCaseStudy={openCaseStudy}
          />
        </div>
      </div>

      <WrepdCaseStudy open={caseStudyOpen} onClose={closeCaseStudy} />
    </section>
  );
}
