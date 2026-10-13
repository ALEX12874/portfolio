import ExperienceItem from "./ExperienceItem";
import type { Experience } from "../../data/experience";
import { experiences } from "../../data/experience";

interface ExperienceListProps {
  onOpen: (experience: Experience, trigger: HTMLElement) => void;
}

/** Thin separators, no boxed cards. */
export default function ExperienceList({ onOpen }: ExperienceListProps) {
  return (
    <ul className="mt-12 border-t border-[rgba(245,240,232,0.14)]">
      {experiences.map((exp) => (
        <li key={exp.id}>
          <ExperienceItem experience={exp} onOpen={onOpen} />
        </li>
      ))}
    </ul>
  );
}
