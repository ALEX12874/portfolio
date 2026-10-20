import { SPOKES, type Pt, type WebGeometry } from "./webGeometry";

/**
 * One requestAnimationFrame loop for the spider and the bugs. Everything is
 * written straight to DOM transforms/attributes (no React state per frame),
 * and only when a value actually changed; the only React update is the
 * sorted-counter callback, a few times a minute.
 *
 * The loop runs only while the section is on screen and the tab is visible
 * (the owner calls start/stop; hidden tabs stop it here). On the `low` tier
 * it renders at 30 fps; motion is time-based, so speeds never change.
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
  /** Silk thread during the drop: a 1 px div moved by transforms. */
  thread: HTMLDivElement;
  slots: SlotEls[];
  labels: HTMLSpanElement[];
  /** Host for the short-lived strand-wobble overlays (same layer as the bugs). */
  wobbleHost: HTMLDivElement;
}

export interface EngineOptions {
  cap: number;
  size: number;
  speed: number;
  labels: readonly string[];
  onSorted: () => void;
  /** Where bugs may land (keeps them off the text, nodes and bottom strip). */
  allow: (p: Pt) => boolean;
  /** Calm motion: no bounce on the drop, bugs arrive less often. */
  calm?: boolean;
  /** Edges bugs fly in from (default: all four). */
  edges?: readonly ("top" | "right" | "bottom" | "left")[];
  /** Horizontal range bugs enter within on the top/bottom edges. */
  entryX?: { x0: number; x1: number };
  /** How far a flight path may swerve (1 = full). */
  wiggle?: number;
  /** Bug labels stay inside this horizontal range (default: the section). */
  labelBounds?: { x0: number; x1: number };
  /** Render at 30 fps (phones / low tier). */
  fps30?: boolean;
  /** Strands tremble where a bug lands / struggles (off on the low tier). */
  wobble?: boolean;
  /** Seconds between new bugs [min, max]. */
  spawnEvery?: [number, number];
  /** Called once if frames stay slow (median > 22 ms over ~3 s). */
  onSlow?: () => void;
}

const SVG_NS = "http://www.w3.org/2000/svg";

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
  /** 30 fps cap: time collected since the last rendered frame. */
  private acc = 0;
  /** Slow-frame watch (60 fps tiers only). */
  private slowDts: number[] = [];
  private slowReported = false;
  /** Paused because the tab is hidden (resume when it comes back). */
  private hiddenPause = false;

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
    document.addEventListener("visibilitychange", this.onVisibility);
    els.thread.style.opacity = "";
    this.render();
  }

  private onVisibility = () => {
    if (document.hidden && this.running) {
      this.hiddenPause = true;
      this.stop();
    } else if (!document.hidden && this.hiddenPause) {
      this.hiddenPause = false;
      this.start();
    }
  };

  /** Write a style/attribute only when it changed. */
  private put(el: Element, key: string, value: string, apply: (v: string) => void) {
    const id = `${key}`;
    let m = this.writtenFor.get(el);
    if (!m) {
      m = new Map();
      this.writtenFor.set(el, m);
    }
    if (m.get(id) === value) return;
    m.set(id, value);
    apply(value);
  }
  private writtenFor = new WeakMap<Element, Map<string, string>>();

  /* ---------------------------------------------------------------- API */

  /** Whether this engine runs the calm (reduced-motion) variant. */
  get calm() {
    return !!this.opts.calm;
  }

  start() {
    if (this.running || document.hidden) return;
    this.running = true;
    this.last = performance.now();
    this.acc = 0;
    this.raf = requestAnimationFrame(this.tick);
  }

  stop() {
    this.running = false;
    cancelAnimationFrame(this.raf);
    this.slowDts = [];
  }

  destroy() {
    this.stop();
    document.removeEventListener("visibilitychange", this.onVisibility);
    this.clearWobbles();
    this.els.slots.forEach((slot) => {
      if (slot?.root) slot.root.className = "web-bug";
    });
  }

  /** Update size-dependent options (entry range, label bounds) in place. */
  configure(partial: Partial<EngineOptions>) {
    Object.assign(this.opts, partial);
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
    this.clearWobbles();
    this.writtenFor = new WeakMap();
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
    this.wobble(n.k, 0.008, n.i);
  }

  /* -------------------------------------------------------------- loop */

  private tick = (now: number) => {
    if (!this.running) return;
    const frame = now - this.last;
    this.last = now;
    this.raf = requestAnimationFrame(this.tick);
    this.watchSlow(frame);
    this.acc += frame;
    // 30 fps cap: skip every other frame (time keeps accumulating)
    if (this.opts.fps30 && this.acc < 30) return;
    const dt = Math.min(0.05, this.acc / 1000);
    this.acc = 0;
    this.time += dt;
    this.update(dt);
    this.render();
  };

  private watchSlow(frame: number) {
    if (this.opts.fps30 || this.slowReported || !this.opts.onSlow || frame <= 0 || frame > 250) return;
    this.slowDts.push(frame);
    if (this.slowDts.length < 180) return;
    const sorted = [...this.slowDts].sort((a, b) => a - b);
    this.slowDts = [];
    if (sorted[90] > 22) {
      this.slowReported = true;
      this.opts.onSlow();
    }
  }

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
    const wig = this.opts.wiggle ?? 1;
    const w1 = (Math.random() - 0.5) * Math.min(220, len * 0.5) * wig;
    const w2 = (Math.random() - 0.5) * Math.min(140, len * 0.3) * wig;
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
      this.writtenFor.delete(labelEl);
      this.labelW[slot] = labelEl.offsetWidth;
    }
    const root = this.els.slots[slot].root;
    root.className = "web-bug is-on is-fly";
    root.dataset.kind = String(Math.floor(Math.random() * 3));
    this.bugs.push(bug);
  }

  private spawnRandom() {
    const g = this.geo;
    const ringCount = g.radius[0].length;
    // pick among the crossings that are actually allowed (on phones most
    // rings run far outside the small web area, so random tries would miss)
    const spots: { i: number; k: number }[] = [];
    for (let i = 0; i < SPOKES; i += 1) {
      for (let k = 3; k < ringCount; k += 1) {
        const p = g.point(i, k);
        if (!this.opts.allow(p)) continue;
        if (this.bugs.some((b) => Math.hypot(b.to.x - p.x, b.to.y - p.y) < 70)) continue;
        spots.push({ i, k });
      }
    }
    if (spots.length) {
      const { i, k } = spots[Math.floor(Math.random() * spots.length)];
      // enter from one of the allowed edges
      const edges = this.opts.edges ?? (["top", "right", "bottom", "left"] as const);
      const edge = edges[Math.floor(Math.random() * edges.length)];
      const ex = this.opts.entryX ?? { x0: 0, x1: g.W };
      const atX = ex.x0 + Math.random() * (ex.x1 - ex.x0);
      const from =
        edge === "top"
          ? { x: atX, y: -30 }
          : edge === "right"
            ? { x: g.W + 30, y: Math.random() * g.H }
            : edge === "bottom"
              ? { x: atX, y: g.H + 30 }
              : { x: -30, y: Math.random() * g.H };
      this.spawn(from, i, k);
    }
  }

  private routeAlongSpoke(i: number, k: number): Pt[] {
    const pts: Pt[] = [{ ...this.geo.hub }];
    for (let r = 0; r <= k; r += 1) pts.push(this.geo.point(i, r));
    return pts;
  }

  /**
   * Strands tremble around spoke i, ring k: only the strand pieces nearest
   * the bug are redrawn in a tiny overlay that wobbles on the compositor and
   * is then removed. A static "cover" in the background colour hides the
   * resting strand underneath while it moves.
   */
  private wobble(k: number, amp: number, i: number) {
    if (!this.opts.wobble) return;
    const host = this.els.wobbleHost;
    if (!host || typeof host.animate !== "function" || host.childElementCount > 6) return;
    const g = this.geo;
    const rings = [k - 1, k, k + 1].filter((kk) => kk >= 1 && kk < g.radius[0].length);
    if (!rings.length) return;
    // bounding box of the strand pieces (plus room for the sag and the wobble)
    let x0 = Infinity;
    let y0 = Infinity;
    let x1 = -Infinity;
    let y1 = -Infinity;
    for (const kk of rings) {
      for (let s = -1; s <= 1; s += 1) {
        const q = g.point(i + s, kk);
        x0 = Math.min(x0, q.x);
        y0 = Math.min(y0, q.y);
        x1 = Math.max(x1, q.x);
        y1 = Math.max(y1, q.y);
      }
    }
    const pad = 14;
    x0 = Math.floor(x0 - pad);
    y0 = Math.floor(y0 - pad);
    const w = Math.ceil(x1 + pad - x0);
    const h = Math.ceil(y1 + pad - y0);
    const box = (cls: string) => {
      const div = document.createElement("div");
      div.className = cls;
      div.style.cssText = `left:${x0}px;top:${y0}px;width:${w}px;height:${h}px`;
      const svg = document.createElementNS(SVG_NS, "svg");
      svg.setAttribute("viewBox", `${x0} ${y0} ${w} ${h}`);
      svg.setAttribute("width", String(w));
      svg.setAttribute("height", String(h));
      for (const kk of rings) {
        const path = document.createElementNS(SVG_NS, "path");
        path.setAttribute("d", g.ringArc(kk, i - 1, i + 1));
        path.setAttribute("stroke-width", String(g.ringWidths[kk] ?? 1));
        svg.appendChild(path);
      }
      div.appendChild(svg);
      host.appendChild(div);
      return div;
    };
    const cover = box("web-wobble web-wobble--cover");
    const strand = box("web-wobble");
    strand.style.transformOrigin = `${(g.hub.x - x0).toFixed(1)}px ${(g.hub.y - y0).toFixed(1)}px`;
    const anim = strand.animate(
      [
        { transform: "scale(1)" },
        { transform: `scale(${1 + amp})` },
        { transform: `scale(${1 - amp * 0.6})` },
        { transform: `scale(${1 + amp * 0.25})` },
        { transform: "scale(1)" },
      ],
      { duration: 750, easing: "ease-out" }
    );
    const done = () => {
      cover.remove();
      strand.remove();
    };
    anim.onfinish = done;
    anim.oncancel = done;
  }

  private clearWobbles() {
    const host = this.els.wobbleHost;
    while (host?.firstChild) host.removeChild(host.firstChild);
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
      const e = this.opts.calm ? 1 - (1 - t) ** 3 : easeOutBack(t);
      s.y = -this.opts.size + (g.hub.y + this.opts.size) * e;
      if (t >= 1) {
        s.state = "idle";
        s.y = g.hub.y;
        this.els.thread.style.opacity = "0";
        this.writtenFor.delete(this.els.thread);
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
          this.els.slots[b.slot].root.classList.remove("is-fly");
          b.pos = { ...b.to };
          this.wobble(b.k, 0.012, b.i);
          this.queue.push(b);
        }
      } else if (b.state === "stuck") {
        const before = b.timer;
        b.timer += dt;
        // the strands around a struggling bug keep trembling
        if (Math.floor(b.timer / 0.9) > Math.floor(before / 0.9)) this.wobble(b.k, 0.004, b.i);
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
        const [lo, hi] = this.opts.spawnEvery ?? [2.5, 4];
        this.spawnIn = lo + Math.random() * (hi - lo);
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
    const sp = this.els.spider;
    this.put(sp, "t", `translate3d(${(s.x - half).toFixed(1)}px, ${(s.y - half).toFixed(1)}px, 0) rotate(${s.angle.toFixed(2)}rad)`, (v) => {
      sp.style.transform = v;
    });

    // silk thread during the drop (a 1 px div stretched with scaleY)
    if (s.state === "wait" || s.state === "drop") {
      const th = this.els.thread;
      const len = Math.max(0, s.y - 4);
      this.put(th, "t", `translate3d(${s.x.toFixed(1)}px, 0, 0) scaleY(${len.toFixed(1)})`, (v) => {
        th.style.transform = v;
      });
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
      this.put(leg, "t", `rotate(${a.toFixed(1)}deg)`, (v) => {
        leg.style.transform = v;
      });
    });

    // eyes follow the cursor (or the nearest bug — a stuck one at its resting
    // point, so its struggle jitter does not move the eyes every frame)
    const near = this.bugs.find((b) => b.state === "fly" || b.state === "stuck");
    const look = this.mouse ?? (near ? (near.state === "stuck" ? near.to : near.pos) : null);
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
      // one CSS transform instead of rewriting cx/cy (quarter-pixel steps)
      const q = (v: number) => (Math.round(v * 4) / 4).toFixed(2);
      this.put(p, "t", `translate(${q(ox)}px, ${q(oy + 0.4)}px)`, (v) => {
        p.style.transform = v;
      });
    });

    // bugs
    for (const b of this.bugs) {
      const { root, body } = this.els.slots[b.slot];
      this.put(root, "t", `translate3d(${b.pos.x.toFixed(1)}px, ${b.pos.y.toFixed(1)}px, 0)`, (v) => {
        root.style.transform = v;
      });
      const lw = this.labelW[b.slot];
      const labelEl = this.els.labels[b.slot];
      if (lw && labelEl) {
        const lb = this.opts.labelBounds ?? { x0: 8, x1: this.geo.W - 8 };
        const left = b.pos.x - lw / 2;
        const shift = left < lb.x0 ? lb.x0 - left : left + lw > lb.x1 ? lb.x1 - (left + lw) : 0;
        this.put(labelEl, "t", `translateX(calc(-50% + ${shift.toFixed(1)}px))`, (v) => {
          labelEl.style.transform = v;
        });
      }
      if (b.state === "fly" || b.state === "stuck") {
        this.put(body, "t", `rotate(${(b.heading + Math.PI / 2).toFixed(2)}rad)`, (v) => {
          body.style.transform = v;
        });
      }
    }
  }
}
