import { renderToStaticMarkup } from "react-dom/server";
import { LazyMotion, domAnimation } from "framer-motion";
import TopBar from "../components/layout/TopBar";
import Hero from "../components/hero/Hero";
import { StaticRender } from "../lib/shell";

/**
 * Build-time render of the first screen (top bar + hero) to static HTML.
 * scripts/prerender-shell.mjs puts it into dist/index.html as `#shell`, so
 * the first screen paints before any JavaScript runs (see lib/shell.ts).
 */
export function render(): string {
  return renderToStaticMarkup(
    <StaticRender.Provider value>
      <LazyMotion features={domAnimation} strict>
        <TopBar />
        <main>
          <Hero />
        </main>
      </LazyMotion>
    </StaticRender.Provider>
  );
}
