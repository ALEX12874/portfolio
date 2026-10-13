import { useRef } from "react";
import type { KeyboardEvent } from "react";
import { projects } from "../../data/projects";
import type { ProjectId } from "../../data/projects";

interface ProjectSelectorProps {
  activeId: ProjectId;
  onSelect: (id: ProjectId) => void;
}

/**
 * Layer A — numbered selector (no boxed cards). Arrow keys move the selection;
 * the active item is marked with aria-current.
 */
export default function ProjectSelector({ activeId, onSelect }: ProjectSelectorProps) {
  const refs = useRef<(HTMLButtonElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLUListElement>) => {
    const index = projects.findIndex((p) => p.id === activeId);
    if (index < 0) return;

    let next = index;
    if (e.key === "ArrowRight" || e.key === "ArrowDown") next = (index + 1) % projects.length;
    else if (e.key === "ArrowLeft" || e.key === "ArrowUp")
      next = (index - 1 + projects.length) % projects.length;
    else if (e.key === "Home") next = 0;
    else if (e.key === "End") next = projects.length - 1;
    else return;

    e.preventDefault();
    onSelect(projects[next].id);
    refs.current[next]?.focus();
  };

  return (
    <nav aria-label="Projects">
      <ul
        onKeyDown={onKeyDown}
        // phones: one horizontal snap row of pills; sm+: the inline text row
        className="-mx-5 flex snap-x snap-mandatory items-center gap-2 overflow-x-auto scroll-px-5 px-5 pb-1 [scrollbar-width:none] sm:mx-0 sm:flex-wrap sm:gap-x-12 sm:gap-y-3 sm:overflow-visible sm:px-0 sm:pb-0"
      >
        {projects.map((p, i) => {
          const active = p.id === activeId;
          return (
            <li key={p.id} className="shrink-0 snap-start">
              <button
                ref={(node) => {
                  refs.current[i] = node;
                }}
                type="button"
                onClick={() => onSelect(p.id)}
                aria-current={active ? "true" : undefined}
                className={`group inline-flex min-h-[44px] items-center gap-2.5 whitespace-nowrap rounded-full border px-4 py-2 text-left sm:min-h-0 sm:items-baseline sm:gap-3 sm:rounded-none sm:border-0 sm:px-0 sm:py-1 ${
                  active ? "border-[var(--proj-accent)]" : "border-[rgba(128,128,128,0.35)]"
                }`}
              >
                <span
                  className={`font-display text-[0.72rem] font-bold tracking-[0.18em] transition-colors duration-400 ${
                    active ? "text-[var(--proj-accent)]" : "text-[var(--proj-fg)] opacity-55"
                  }`}
                >
                  {p.number}
                </span>
                <span
                  className={`relative font-display text-[clamp(1rem,1.6vw,1.4rem)] font-extrabold uppercase tracking-tight transition-[color,opacity] duration-400 ${
                    active ? "text-[var(--proj-fg)]" : "text-[var(--proj-fg)] opacity-55"
                  }`}
                >
                  {p.name}
                  <span
                    className={`absolute -bottom-1 left-0 h-[3px] rounded-full bg-[var(--proj-accent)] transition-[width] duration-500 ease-editorial ${
                      active ? "w-full" : "w-0 group-hover:w-1/3"
                    }`}
                    aria-hidden="true"
                  />
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
