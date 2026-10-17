import { SPOKES, type Pt, type WebGeometry } from "./webGeometry";

/**
 * One requestAnimationFrame loop for the spider and the bugs. Everything is
 * written straight to DOM transforms/attributes (no React state per frame);
 * the only React update is the sorted-counter callback, a few times a minute.
 */

/** Leg roots (spider SVG local coords, facing up). Shared with the JSX. */
export const LEG_ROOTS: Pt[] = [-1, 1].flatMap((s) =>
  [0, 1, 2, 3].map((j) => ({ x: s * 3, y: -6 + j * 3.4 }))
);
export const PUPIL_BASE: Pt[] = [
  { x: -2.6, y: -9.2 },
  { x: 2.6, y: -9.2 },
];

export interface SlotEls {
  root: HTMLDivElement;
  body: HTMLDivElement;
}

export interface EngineEls {
  spider: HTMLDivElement;
  legs: SVGGElement[];
  pupils: SVGCircleElement[];
  thread: SVGLineElement;
  slots: SlotEls[];
  rings: SVGPathElement[];
  labels: HTMLSpanElement[];
}

export interface EngineOptions {
  cap: number;
  size: number;
  speed: number;
  labels: readonly string[];
  onSorted: () => void;
  /** Where bugs may land (keeps them off the text, nodes and bottom strip). */
  allow: (p: Pt) => boolean;
}

type BugState = "fly" | "stuck" | "wrap" | "sorted" | "fade";

interface Bug {
  slot: number;
  state: BugState;
  from: Pt;
  c1: Pt;
  c2: Pt;
  to: Pt;
  i: number;
  k: number;
  t: number;
  dur: number;
  timer: number;
  pos: Pt;
  heading: number;
  seed: number;
}

type SpiderState = "wait" | "drop" | "idle" | "out" | "wrap" | "back";

const easeOutBack = (t: number) => {
  const c1 = 1.5;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

const bezier = (a: Pt, b: Pt, c: Pt, d: Pt, t: number): Pt => {
  const u = 1 - t;
  return {
    x: u * u * u * a.x + 3 * u * u * t * b.x + 3 * u * t * t * c.x + t * t * t * d.x,
    y: u * u * u * a.y + 3 * u * u * t * b.y + 3 * u * t * t * c.y + t * t * t * d.y,
  };
};

const angleLerp = (a: number, b: number, k: number) => {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return a + d * k;
};

export class SpiderEngine {
  private geo: WebGeometry;
  private els: EngineEls;
  /** Measured width of each slot's label pill (to keep it on screen). */
  private labelW: number[] = [];
  private opts: EngineOptions;

  private running = false;
  private raf = 0;
  private last = 0;
  private time = 0;

  private spider = {
    x: 0,
    y: 0,
    angle: 0,
    state: "wait" as SpiderState,
    route: [] as Pt[],
    seg: 0,
    target: null as Bug | null,
    timer: 0,
    legPhase: 0,
    twitchLeg: -1,
    twitchT: 0,
  };
  private bugs: Bug[] = [];
  private queue: Bug[] = [];
  private spawnIn = 1.2;
  private labelIdx = 0;
  private mouse: Pt | null = null;
  private dropDelay = 1.6;

  constructor(geo: WebGeometry, els: EngineEls, opts: EngineOptions) {
    this.geo = geo;
    this.els = els;
    this.opts = opts;
    this.spider.x = geo.hub.x;
    this.spider.y = -opts.size;
    this.render();
  }

  /* ---------------------------------------------------------------- API */

  start() {
    if (this.running) return;
    this.running = true;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
  }

  destroy() {
    this.stop();
    this.els.slots.forEach((slot) => {
      if (slot?.root) slot.root.className = "web-bug";
    });
  }

  setMouse(p: Pt | null) {
    this.mouse = p;
  }

  /** Drop a bug at a point the visitor clicked/tapped. */
  throwBug(p: Pt) {
    if (this.spider.state === "wait" || this.spider.state === "drop") return;
    if (this.activeCount() >= this.opts.cap) return;
    const near = this.geo.nearest(p, 2);
    const from = { x: near.p.x + (Math.random() - 0.5) * 30, y: near.p.y - 90 };
    this.spawn(from, near.i, near.k, 0.6);
  }

  /** Geometry changed (resize): restart the scene on the new web. */
  setGeometry(geo: WebGeometry) {
    this.geo = geo;
    this.bugs.forEach((b) => this.hideSlot(b.slot));
    this.bugs = [];
    this.queue = [];
    const s = this.spider;
    s.route = [];
    s.target = null;
    if (s.state !== "wait") {
      s.state = "idle";
      s.x = geo.hub.x;
      s.y = geo.hub.y;
    } else {
      s.x = geo.hub.x;
    }
    this.render();
  }

  /** Point the vibration at a skill node (hover). */
  vibrateAt(p: Pt) {
    const n = this.geo.nearest(p, 1);
    this.wobble(n.k, 0.008);
  }

  /* -------------------------------------------------------------- loop */

  private tick = (now: number) => {
    if (!this.running) return;
    const dt = Math.min(0.05, (now - this.last) / 1000);
    this.last = now;
    this.time += dt;
    this.update(dt);
    this.render();
    this.raf = requestAnimationFrame(this.tick);
  };

  private activeCount() {
    return this.bugs.filter((b) => b.state !== "fade").length;
  }

  private freeSlot(): number {
    for (let i = 0; i < this.els.slots.length && i < this.opts.cap; i += 1) {
      if (!this.bugs.some((b) => b.slot === i)) return i;
    }
    return -1;
  }

  private spawn(from: Pt, i: number, k: number, dur?: number) {
    const slot = this.freeSlot();
    if (slot < 0) return;
    const to = this.geo.point(i, k);
    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const w1 = (Math.random() - 0.5) * Math.min(220, len * 0.5);
    const w2 = (Math.random() - 0.5) * Math.min(140, len * 0.3);
    const bug: Bug = {
      slot,
      state: "fly",
      from,
      c1: { x: from.x + dx * 0.33 + nx * w1, y: from.y + dy * 0.33 + ny * w1 },
      c2: { x: from.x + dx * 0.66 + nx * w2, y: from.y + dy * 0.66 + ny * w2 },
      to,
      i,
      k,
      t: 0,
      dur: dur ?? Math.min(3.2, Math.max(1.3, len / 170)),
      timer: 0,
      pos: { ...from },
      heading: Math.atan2(dy, dx),
      seed: Math.random() * 10,
    };
    // label
    const label = this.opts.labels[this.labelIdx % this.opts.labels.length];
    this.labelIdx += 1;
    const labelEl = this.els.labels[slot];
    if (labelEl) {
      labelEl.textContent = label;
      labelEl.style.transform = "";
      this.labelW[slot] = labelEl.offsetWidth;
    }
    const root = this.els.slots[slot].root;
    root.className = "web-bug is-on";
    root.dataset.kind = String(Math.floor(Math.random() * 3));
    this.bugs.push(bug);
  }

  private spawnRandom() {
    const g = this.geo;
    const ringCount = g.radius[0].length;
    for (let tries = 0; tries < 50; tries += 1) {
      const i = Math.floor(Math.random() * SPOKES);
      const k = 3 + Math.floor(Math.random() * Math.max(1, ringCount - 4));
      const p = g.point(i, k);
      if (!this.opts.allow(p)) continue;
      if (this.bugs.some((b) => Math.hypot(b.to.x - p.x, b.to.y - p.y) < 70)) continue;
      // enter from a random edge
      const edge = Math.floor(Math.random() * 4);
      const from =
        edge === 0
          ? { x: Math.random() * g.W, y: -30 }
          : edge === 1
            ? { x: g.W + 30, y: Math.random() * g.H }
            : edge === 2
              ? { x: Math.random() * g.W, y: g.H + 30 }
              : { x: -30, y: Math.random() * g.H };
      this.spawn(from, i, k);
      return;
    }
  }

  private routeAlongSpoke(i: number, k: number): Pt[] {
    const pts: Pt[] = [{ ...this.geo.hub }];
    for (let r = 0; r <= k; r += 1) pts.push(this.geo.point(i, r));
    return pts;
  }

  private wobble(k: number, amp: number) {
    const g = this.geo;
    [k - 1, k, k + 1].forEach((kk, n) => {
      const el = this.els.rings[kk];
      if (!el || typeof el.animate !== "function") return;
      const a = n === 1 ? amp : amp * 0.45;
      el.style.transformOrigin = `${g.hub.x}px ${g.hub.y}px`;
      el.animate(
        [
          { transform: "scale(1)" },
          { transform: `scale(${1 + a})` },
          { transform: `scale(${1 - a * 0.6})` },
          { transform: `scale(${1 + a * 0.25})` },
          { transform: "scale(1)" },
        ],
        { duration: 750, easing: "ease-out" }
      );
    });
  }

  private hideSlot(slot: number) {
    const root = this.els.slots[slot]?.root;
    if (root) root.className = "web-bug";
  }

  /* ------------------------------------------------------------ update */

  private update(dt: number) {
    const s = this.spider;
    const g = this.geo;
    const speed = this.opts.speed;

    // ---- spider
    if (s.state === "wait") {
      this.dropDelay -= dt;
      if (this.dropDelay <= 0) {
        s.state = "drop";
        s.timer = 0;
      }
    } else if (s.state === "drop") {
      s.timer += dt / 1.15;
      const t = Math.min(1, s.timer);
      s.x = g.hub.x;
      s.y = -this.opts.size + (g.hub.y + this.opts.size) * easeOutBack(t);
      if (t >= 1) {
        s.state = "idle";
        s.y = g.hub.y;
        this.els.thread.style.opacity = "0";
      }
    } else if (s.state === "idle") {
      const next = this.queue.shift();
      if (next) {
        s.target = next;
        s.route = this.routeAlongSpoke(next.i, next.k);
        s.seg = 0;
        s.state = "out";
      } else {
        // face the nearest bug, otherwise drift upright
        const near = this.bugs.find((b) => b.state === "fly" || b.state === "stuck");
        const want = near ? Math.atan2(near.pos.y - s.y, near.pos.x - s.x) + Math.PI / 2 : 0;
        s.angle = angleLerp(s.angle, want, 0.03);
      }
    } else if (s.state === "out" || s.state === "back") {
      if (this.walk(dt * speed)) {
        if (s.state === "out" && s.target) {
          s.state = "wrap";
          s.timer = 0;
          s.target.state = "wrap";
          s.target.timer = 0;
          this.els.slots[s.target.slot].root.classList.add("is-wrap");
        } else {
          s.state = "idle";
          s.x = g.hub.x;
          s.y = g.hub.y;
        }
      }
    } else if (s.state === "wrap") {
      s.timer += dt;
      if (s.timer > 0.85 && s.target) {
        const b = s.target;
        b.state = "sorted";
        b.timer = 0;
        this.els.slots[b.slot].root.classList.add("is-sorted");
        this.opts.onSorted();
        s.target = null;
        s.route = s.route.slice().reverse();
        s.seg = 0;
        s.state = "back";
      }
    }

    // legs: tetrapod gait while walking, occasional twitch at rest
    const walking = s.state === "out" || s.state === "back" || s.state === "drop";
    if (walking) s.legPhase += dt * (s.state === "drop" ? 9 : speed / 6.5);
    if (!walking) {
      s.twitchT -= dt;
      if (s.twitchT <= 0) {
        s.twitchLeg = Math.random() < 0.6 ? Math.floor(Math.random() * 8) : -1;
        s.twitchT = 0.18 + Math.random() * 1.8;
      }
    }

    // ---- bugs
    for (const b of this.bugs) {
      if (b.state === "fly") {
        b.t += dt / b.dur;
        const t = Math.min(1, b.t);
        const p = bezier(b.from, b.c1, b.c2, b.to, t);
        const wob = Math.sin(this.time * 9 + b.seed) * 4 * (1 - t);
        const ahead = bezier(b.from, b.c1, b.c2, b.to, Math.min(1, t + 0.02));
        b.heading = Math.atan2(ahead.y - p.y, ahead.x - p.x);
        b.pos = { x: p.x + Math.cos(b.heading + Math.PI / 2) * wob, y: p.y + Math.sin(b.heading + Math.PI / 2) * wob };
        if (t >= 1) {
          b.state = "stuck";
          b.pos = { ...b.to };
          this.wobble(b.k, 0.012);
          this.queue.push(b);
        }
      } else if (b.state === "stuck") {
        b.timer += dt;
        // struggling: small rapid jitter
        b.pos = {
          x: b.to.x + Math.sin(this.time * 47 + b.seed) * 1.4,
          y: b.to.y + Math.cos(this.time * 53 + b.seed) * 1.1,
        };
      } else if (b.state === "wrap") {
        b.pos = { ...b.to };
      } else if (b.state === "sorted") {
        b.timer += dt;
        if (b.timer > 1.2) {
          b.state = "fade";
          b.timer = 0;
          this.els.slots[b.slot].root.classList.add("is-fade");
        }
      } else if (b.state === "fade") {
        b.timer += dt;
      }
    }
    // free faded bugs
    const done = this.bugs.filter((b) => b.state === "fade" && b.timer > 0.55);
    done.forEach((b) => this.hideSlot(b.slot));
    if (done.length) this.bugs = this.bugs.filter((b) => !done.includes(b));

    // ---- spawning (every 2.5–4 s, capped)
    if (s.state !== "wait" && s.state !== "drop") {
      this.spawnIn -= dt;
      if (this.spawnIn <= 0) {
        if (this.activeCount() < this.opts.cap) this.spawnRandom();
        this.spawnIn = 2.5 + Math.random() * 1.5;
      }
    }
  }

  /** Move along the route; returns true when the end is reached. */
  private walk(dist: number): boolean {
    const s = this.spider;
    let left = dist;
    while (left > 0 && s.seg < s.route.length - 1) {
      const a = { x: s.x, y: s.y };
      const b = s.route[s.seg + 1];
      const d = Math.hypot(b.x - a.x, b.y - a.y);
      if (d > 0.5) s.angle = angleLerp(s.angle, Math.atan2(b.y - a.y, b.x - a.x) + Math.PI / 2, 0.25);
      if (d <= left) {
        s.x = b.x;
        s.y = b.y;
        s.seg += 1;
        left -= d;
      } else {
        s.x += ((b.x - a.x) / d) * left;
        s.y += ((b.y - a.y) / d) * left;
        left = 0;
      }
    }
    return s.seg >= s.route.length - 1;
  }

  /* ------------------------------------------------------------ render */

  private render() {
    const s = this.spider;
    const half = this.opts.size / 2;
    this.els.spider.style.transform = `translate3d(${(s.x - half).toFixed(1)}px, ${(s.y - half).toFixed(1)}px, 0) rotate(${s.angle.toFixed(3)}rad)`;

    // silk thread during the drop
    if (s.state === "wait" || s.state === "drop") {
      this.els.thread.setAttribute("x1", s.x.toFixed(1));
      this.els.thread.setAttribute("x2", s.x.toFixed(1));
      this.els.thread.setAttribute("y2", Math.max(0, s.y - 4).toFixed(1));
    }

    // legs
    const walking = s.state === "out" || s.state === "back" || s.state === "drop";
    this.els.legs.forEach((leg, n) => {
      const side = n < 4 ? -1 : 1;
      const j = n % 4;
      const group = (side < 0 ? j % 2 : (j + 1) % 2) * Math.PI;
      let a = 0;
      if (walking) a = Math.sin(s.legPhase + group) * 16 * side;
      else if (n === s.twitchLeg) a = Math.sin(this.time * 40) * 7;
      const r = LEG_ROOTS[n];
      leg.setAttribute("transform", `rotate(${a.toFixed(2)} ${r.x} ${r.y})`);
    });

    // eyes follow the cursor (or the nearest bug)
    const look =
      this.mouse ?? this.bugs.find((b) => b.state === "fly" || b.state === "stuck")?.pos ?? null;
    this.els.pupils.forEach((p, n) => {
      const base = PUPIL_BASE[n];
      let ox = 0;
      let oy = -0.4;
      if (look) {
        const wx = look.x - s.x;
        const wy = look.y - s.y;
        const d = Math.hypot(wx, wy) || 1;
        // world → spider-local
        const c = Math.cos(-s.angle);
        const sn = Math.sin(-s.angle);
        ox = ((wx * c - wy * sn) / d) * 0.75;
        oy = ((wx * sn + wy * c) / d) * 0.75;
      }
      p.setAttribute("cx", (base.x + ox).toFixed(2));
      p.setAttribute("cy", (base.y + oy).toFixed(2));
    });

    // bugs
    for (const b of this.bugs) {
      const { root, body } = this.els.slots[b.slot];
      root.style.transform = `translate3d(${b.pos.x.toFixed(1)}px, ${b.pos.y.toFixed(1)}px, 0)`;
      const lw = this.labelW[b.slot];
      const labelEl = this.els.labels[b.slot];
      if (lw && labelEl) {
        const left = b.pos.x - lw / 2;
        const shift = left < 8 ? 8 - left : left + lw > this.geo.W - 8 ? this.geo.W - 8 - (left + lw) : 0;
        labelEl.style.transform = `translateX(calc(-50% + ${shift.toFixed(1)}px))`;
      }
      if (b.state === "fly" || b.state === "stuck") {
        body.style.transform = `rotate(${(b.heading + Math.PI / 2).toFixed(3)}rad)`;
      }
    }
  }
}
