import { allSkills } from "../../data/skills";

interface SkillNavigationProps {
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string) => void;
  onHover: (id: string | null) => void;
}

/**
 * Synchronised numbered navigation rail (01 Sun + planets 02–09).
 * Selecting an item selects the planet and vice versa — one shared state.
 */
export default function SkillNavigation({
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: SkillNavigationProps) {
  return (
    <nav aria-label="Capabilities">
      <p className="font-display text-[0.66rem] font-bold uppercase tracking-[0.24em] text-[rgba(245,240,232,0.45)]">
        Index
      </p>
      <ul className="mt-4 flex gap-2 overflow-x-auto pb-2 lg:mt-5 lg:block lg:gap-0 lg:overflow-visible lg:pb-0">
        {allSkills.map((s) => {
          const active = s.id === selectedId;
          const hot = s.id === hoveredId;
          return (
            <li key={s.id} className="shrink-0 lg:border-b lg:border-[rgba(245,240,232,0.1)]">
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                onMouseEnter={() => onHover(s.id)}
                onMouseLeave={() => onHover(null)}
                aria-pressed={active}
                className={`group flex w-full items-center gap-3 whitespace-nowrap rounded-full lg:items-start lg:whitespace-normal border px-3 py-2 text-left transition-all duration-400 ease-editorial lg:rounded-none lg:border-0 lg:px-0 lg:py-3 ${
                  active
                    ? "border-[#D8FF63] bg-[rgba(216,255,99,0.08)]"
                    : "border-[rgba(245,240,232,0.18)] hover:border-[rgba(245,240,232,0.4)]"
                }`}
              >
                <span
                  className={`font-display text-[0.7rem] font-bold tracking-[0.14em] transition-colors duration-300 lg:pt-[0.06rem] ${
                    active ? "text-[#D8FF63]" : "text-[rgba(245,240,232,0.55)]"
                  }`}
                >
                  {s.number}
                </span>
                <span
                  className={`hidden font-display text-[0.76rem] font-bold uppercase leading-[1.35] tracking-[0.08em] transition-colors duration-300 lg:inline ${
                    active
                      ? "text-[#F5F0E8]"
                      : hot
                        ? "text-[#D8FF63]"
                        : "text-[rgba(245,240,232,0.75)]"
                  }`}
                >
                  {s.title}
                </span>
                {active ? (
                  <span
                    className="ml-auto mt-[0.3rem] hidden h-1.5 w-1.5 shrink-0 rounded-full bg-[#E63843] lg:inline-block"
                    aria-hidden="true"
                  />
                ) : null}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
