/**
 * Loads the below-the-fold sections one at a time.
 *
 * Mounting every section at once after first paint is what made the page
 * load "in pieces with a freeze". Instead each section waits its turn: the
 * next one starts only after the previous has mounted and the browser is idle
 * again. A section the visitor scrolls near (~1000 px) jumps the queue.
 * Nothing starts before the page has loaded and the first screen is painted.
 */

type IdleWindow = Window & {
  requestIdleCallback?: (cb: () => void, opts?: { timeout: number }) => number;
};

interface Job {
  order: number;
  start: () => void;
  started: boolean;
  done: boolean;
}

const jobs = new Map<string, Job>();
let running = 0;
let opened = false;
let scheduled = false;

function idle(cb: () => void) {
  const ric = (window as IdleWindow).requestIdleCallback;
  if (ric) ric(cb, { timeout: 1500 });
  else window.setTimeout(cb, 120);
}

function run(id: string) {
  const job = jobs.get(id);
  if (!job || job.started) return;
  job.started = true;
  running += 1;
  job.start();
  // a section that fails (its error boundary shows Retry) never reports
  // "mounted": don't let it hold up the rest of the page
  window.setTimeout(() => sectionMounted(id), 8000);
}

/** Start the next waiting section on the next idle moment. */
function pump() {
  if (!opened || running > 0 || scheduled) return;
  const next = [...jobs.entries()].filter(([, j]) => !j.started).sort((a, b) => a[1].order - b[1].order)[0];
  if (!next) return;
  scheduled = true;
  idle(() => {
    scheduled = false;
    if (running > 0) return pump();
    run(next[0]);
  });
}

/** The queue opens once the page has loaded (first screen painted). */
function open() {
  if (opened) return;
  opened = true;
  pump();
}
if (typeof window !== "undefined") {
  if (document.readyState === "complete") window.setTimeout(open, 0);
  else window.addEventListener("load", () => window.setTimeout(open, 0), { once: true });
}

export function enqueueSection(id: string, order: number, start: () => void) {
  if (!jobs.has(id)) jobs.set(id, { order, start, started: false, done: false });
  pump();
}

/** The visitor is close to this section: load it now. */
export function prioritiseSection(id: string) {
  run(id);
}

/** The section has mounted: let the next one go (after a frame). */
export function sectionMounted(id: string) {
  const job = jobs.get(id);
  if (!job || job.done) return;
  job.done = true;
  running = Math.max(0, running - 1);
  requestAnimationFrame(() => pump());
}

export function forgetSection(id: string) {
  const job = jobs.get(id);
  if (job?.started && !job.done) running = Math.max(0, running - 1);
  jobs.delete(id);
}
