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
        className="flex flex-wrap items-center gap-x-8 gap-y-3 sm:gap-x-12"
      >
        {projects.map((p, i) => {
          const active = p.id === activeId;
          return (
            <li key={p.id}>
              <button
                ref={(node) => {
                  refs.current[i] = node;
                }}
                type="button"
                onClick={() => onSelect(p.id)}
                aria-current={active ? "true" : undefined}
                className="group inline-flex items-baseline gap-3 py-1 text-left"
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
