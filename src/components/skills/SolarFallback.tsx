import { sunSkill, skills } from "../../data/skills";

interface SolarFallbackProps {
  selectedId: string | null;
  hoveredId: string | null;
  onSelect: (id: string | null) => void;
  onHover: (id: string | null) => void;
}

const BOX = 600;
const MAX_ORBIT = 10.2;
const SCALE = (BOX / 2 - 26) / MAX_ORBIT;

/**
 * CSS/SVG orbit diagram used when WebGL is unavailable — same data, same rail
 * and same panel, so the section stays fully usable.
 */
export default function SolarFallback({
  selectedId,
  hoveredId,
  onSelect,
  onHover,
}: SolarFallbackProps) {
  const place = (radius: number, angle: number) => {
    const x = BOX / 2 + Math.cos(angle) * radius * SCALE;
    const y = BOX / 2 + Math.sin(angle) * radius * SCALE * 0.72; // slight ellipse
    return { left: `${(x / BOX) * 100}%`, top: `${(y / BOX) * 100}%` };
  };

  return (
    <div
      className="relative mx-auto aspect-square w-full max-w-[560px]"
      role="group"
      aria-label="Orbit diagram of marketing skills (3D unavailable)"
    >
      {/* orbit rings + sun */}
      <svg
        viewBox={`0 0 ${BOX} ${BOX}`}
        className="absolute inset-0 h-full w-full"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="sun-glow">
            <stop offset="0%" stopColor="#E63843" stopOpacity="0.55" />
            <stop offset="60%" stopColor="#E63843" stopOpacity="0.12" />
            <stop offset="100%" stopColor="#E63843" stopOpacity="0" />
          </radialGradient>
        </defs>

        {skills.map((s) => (
          <ellipse
            key={s.id}
            cx={BOX / 2}
            cy={BOX / 2}
            rx={s.orbitRadius * SCALE}
            ry={s.orbitRadius * SCALE * 0.72}
            fill="none"
            stroke={selectedId === s.id || hoveredId === s.id ? "#D8FF63" : "#F5F0E8"}
            strokeOpacity={selectedId === s.id || hoveredId === s.id ? 0.6 : 0.16}
            strokeWidth={1.4}
          />
        ))}

        <circle cx={BOX / 2} cy={BOX / 2} r={140} fill="url(#sun-glow)" />
        <circle
          cx={BOX / 2}
          cy={BOX / 2}
          r={52}
          fill="#E63843"
          stroke={selectedId === sunSkill.id ? "#D8FF63" : "transparent"}
          strokeWidth={3}
        />
      </svg>

      {/* sun (selectable) */}
      <button
        type="button"
        onClick={() => onSelect(sunSkill.id)}
        onMouseEnter={() => onHover(sunSkill.id)}
        onMouseLeave={() => onHover(null)}
        className="absolute -translate-x-1/2 -translate-y-1/2 rounded-full px-4 py-2 font-display text-[0.62rem] font-bold uppercase tracking-[0.18em] text-[#F5F0E8]"
        style={{ left: "50%", top: "50%" }}
        aria-pressed={selectedId === sunSkill.id}
      >
        {sunSkill.title}
      </button>

      {/* planets (selectable) */}
      {skills.map((s) => {
        const pos = place(s.orbitRadius, s.phase);
        const active = selectedId === s.id;
        return (
          <button
            key={s.id}
            type="button"
            onClick={() => onSelect(s.id)}
            onMouseEnter={() => onHover(s.id)}
            onMouseLeave={() => onHover(null)}
            className="group absolute -translate-x-1/2 -translate-y-1/2"
            style={pos}
            aria-pressed={active}
            aria-label={`${s.number} — ${s.title}`}
          >
            <span
              className="block rounded-full transition-transform duration-400 ease-editorial group-hover:scale-125"
              style={{
                width: `${Math.max(16, s.size * 34)}px`,
                height: `${Math.max(16, s.size * 34)}px`,
                background: s.color,
                border: active ? "3px solid #D8FF63" : "1px solid rgba(245,240,232,0.35)",
              }}
            />
            <span
              className={`pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap font-display text-[0.56rem] font-bold uppercase tracking-[0.16em] transition-colors duration-300 ${
                active ? "text-[#D8FF63]" : "text-[rgba(245,240,232,0.6)]"
              }`}
            >
              {s.number}
            </span>
          </button>
        );
      })}
    </div>
  );
}
