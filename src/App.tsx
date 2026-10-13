import TopBar from "./components/layout/TopBar";
import Footer from "./components/layout/Footer";
import Hero from "./components/hero/Hero";
import Capabilities from "./components/skills/Capabilities";
import ProjectsSection from "./components/projects/ProjectsSection";
import ExperienceSection from "./components/experience/ExperienceSection";
import PerspectivesSection from "./components/perspectives/PerspectivesSection";

/**
 * Single-page portfolio: five sections + footer.
 */
export default function App() {
  return (
    <>
      <a className="skip-link" href="#home">
        Skip to content
      </a>

      <TopBar />

      <main id="main">
        <Hero />

        <Capabilities />

        <ProjectsSection />

        <ExperienceSection />

        <PerspectivesSection />
      </main>

      <Footer />
    </>
  );
}
