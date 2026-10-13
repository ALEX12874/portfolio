import { lazy } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import TopBar from "./components/layout/TopBar";
import Hero from "./components/hero/Hero";
import Capabilities from "./components/skills/Capabilities";
import DeferredSection from "./components/layout/DeferredSection";

// below the fold: separate chunks, rendered right after first paint
const ProjectsSection = lazy(() => import("./components/projects/ProjectsSection"));
const ExperienceSection = lazy(() => import("./components/experience/ExperienceSection"));
const PerspectivesSection = lazy(() => import("./components/perspectives/PerspectivesSection"));
const Footer = lazy(() => import("./components/layout/Footer"));

/**
 * Single-page portfolio: five sections + footer.
 */
export default function App() {
  return (
    // m.* components + the compact DOM feature set (no layout/drag features
    // are used) keep framer-motion's share of the bundle small
    <LazyMotion features={domAnimation} strict>
      <a className="skip-link" href="#home">
        Skip to content
      </a>

      <TopBar />

      <main id="main">
        <Hero />

        <Capabilities />

        <DeferredSection id="projects" tone="#14342B">
          <ProjectsSection />
        </DeferredSection>

        <DeferredSection id="experience" tone="#151515">
          <ExperienceSection />
        </DeferredSection>

        <DeferredSection id="perspectives" tone="#F5F0E8">
          <PerspectivesSection />
        </DeferredSection>
      </main>

      <DeferredSection id="contact" tone="#151515">
        <Footer />
      </DeferredSection>
    </LazyMotion>
  );
}
