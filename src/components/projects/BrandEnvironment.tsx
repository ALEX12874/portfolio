import type { Project } from "../../data/projects";
import DipNSipEnv from "./environments/DipNSipEnv";
import WrepdEnv from "./environments/WrepdEnv";
import SynkkEnv from "./environments/SynkkEnv";
import InayatEnv from "./environments/InayatEnv";

/**
 * Layer B — the visual stage. Renders the environment of the active project;
 * every environment is CSS/SVG based (no canvas), so mobile stays light.
 */
export default function BrandEnvironment({ project }: { project: Project }) {
  switch (project.id) {
    case "dipnsip":
      return <DipNSipEnv />;
    case "wrepd":
      return <WrepdEnv />;
    case "synkk":
      return <SynkkEnv />;
    case "inayat":
      return <InayatEnv />;
    default:
      return null;
  }
}
