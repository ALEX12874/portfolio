import { lazy, useEffect } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import TopBar from "./components/layout/TopBar";
import Hero from "./components/hero/Hero";
import Capabilities from "./components/skills/Capabilities";
import DeferredSection from "./components/layout/DeferredSection";
import RetryBoundary from "./components/layout/RetryBoundary";
import { prefetchOnIdle } from "./lib/prefetch";
import { startSmoothScroll } from "./lib/smoothScroll";

// below the fold: separate chunks, rendered right after first paint
const ProjectsSection = lazy(() => import("./components/projects/ProjectsSection"));
const ExperienceSection = lazy(() => import("./components/experience/ExperienceSection"));
const RealMeSection = lazy(() => import("./components/realme/RealMeSection"));
const PerspectivesSection = lazy(() => import("./components/perspectives/PerspectivesSection"));
const Footer = lazy(() => import("./components/layout/Footer"));

/**
 * Single-page portfolio: six sections + footer. Every section sits in its own
 * error boundary, so one failing part never blanks the page.
 */
export default function App() {
  // after first paint, on idle: project logos + (desktop/tablet) the 3D chunk
  useEffect(() => prefetchOnIdle(), []);

  // desktop wheel/trackpad: inertial smooth scrolling, started once the page
  // has loaded so it never touches first paint
  useEffect(() => {
    const go = () => startSmoothScroll();
    if (document.readyState === "complete") go();
    else window.addEventListener("load", go, { once: true });
    return () => window.removeEventListener("load", go);
  }, []);

  return (
    // m.* components + the compact DOM feature set (no layout/drag features
    // are used) keep framer-motion's share of the bundle small
    <LazyMotion features={domAnimation} strict>
      <a className="skip-link" href="#home">
        Skip to content
      </a>

      <TopBar />

      <main id="main">
        <RetryBoundary id="home" label="the intro" tone="ivory" section>
          <Hero />
        </RetryBoundary>

        <RetryBoundary id="capabilities" label="capabilities" tone="ink" section>
          <Capabilities />
        </RetryBoundary>

        <DeferredSection id="projects" tone="#14342B" label="the projects">
          <ProjectsSection />
        </DeferredSection>

        <DeferredSection id="experience" tone="#151515" label="the experience">
          <ExperienceSection />
        </DeferredSection>

        <DeferredSection id="real-me" tone="#EFE8DC" label="The Real Me">
          <RealMeSection />
        </DeferredSection>

        <DeferredSection id="perspectives" tone="#F5F0E8" label="the perspectives">
          <PerspectivesSection />
        </DeferredSection>
      </main>

      <DeferredSection id="contact" tone="#151515" label="the contact section">
        <Footer />
      </DeferredSection>
    </LazyMotion>
  );
}
