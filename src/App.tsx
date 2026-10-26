import { lazy, useEffect } from "react";
import { LazyMotion, domAnimation } from "framer-motion";
import TopBar from "./components/layout/TopBar";
import Hero from "./components/hero/Hero";
import DeferredSection from "./components/layout/DeferredSection";
import RetryBoundary from "./components/layout/RetryBoundary";
import { prefetchOnIdle } from "./lib/prefetch";
import { startSmoothScroll } from "./lib/smoothScroll";
import { startOffscreenPause } from "./lib/offscreenPause";
import { whenSettled } from "./lib/settle";

// below the fold: separate chunks, loaded one at a time after first paint
// (lib/sectionQueue), so the first screen never waits for them
const Capabilities = lazy(() => import("./components/skills/Capabilities"));
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
  // once the first screen is painted and the page is idle: project logos +
  // (desktop/tablet) the solar-system chunk
  useEffect(() => {
    let cancel: (() => void) | null = null;
    let live = true;
    void whenSettled().then(() => {
      if (live) cancel = prefetchOnIdle();
    });
    return () => {
      live = false;
      cancel?.();
    };
  }, []);

  // off-screen sections stop their CSS animations (no invisible repaints)
  useEffect(() => startOffscreenPause(), []);

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

        <DeferredSection id="capabilities" order={1} tone="#151515" label="capabilities">
          <Capabilities />
        </DeferredSection>

        <DeferredSection id="projects" order={2} tone="#14342B" label="the projects">
          <ProjectsSection />
        </DeferredSection>

        <DeferredSection id="experience" order={3} tone="#151515" label="the experience">
          <ExperienceSection />
        </DeferredSection>

        <DeferredSection id="real-me" order={4} tone="#EFE8DC" label="The Real Me">
          <RealMeSection />
        </DeferredSection>

        <DeferredSection id="perspectives" order={5} tone="#F5F0E8" label="the perspectives">
          <PerspectivesSection />
        </DeferredSection>
      </main>

      <DeferredSection id="contact" order={6} tone="#151515" label="the contact section">
        <Footer />
      </DeferredSection>
    </LazyMotion>
  );
}
