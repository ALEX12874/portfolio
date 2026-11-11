/**
 * Venom goo for the footer's "Whisper to me" pill (desktop mice only; the
 * loader in WhisperButton checks). While the pointer is near, the pill is
 * drawn as glossy black liquid in WebGL: its surface swells toward the
 * pointer, tendrils stretch out and latch onto it, and snap back into the
 * pill when pulled too far or when the pointer leaves.
 *
 * Shape: a 2-D signed-distance field (the pill smooth-merged with tapered
 * rope tendrils and a bulge), turned into a rounded height so every pixel
 * gets a normal; lit like lacquer under studio strips (Fresnel reflections,
 * a sharp key glint), all in one fragment shader pass.
 *
 * Cost model: one small canvas around the button, in the page only while the
 * goo shows. pointermove stores two numbers; one requestAnimationFrame loop
 * (rope physics on preallocated Float32Arrays + one draw call) runs only while
 * the pointer is near or tendrils are settling. No layout reads per frame.
 */

import { voiceState } from "../../lib/voicePlayer";

// ---- tuning ----
export const ZONE_PADDING = 140; // px around the button where the goo wakes up
export const MAX_STRANDS = 5;
export const AWARENESS = 150; // px from the pill's edge where tendrils start reaching
export const MAX_LEN = 170; // px, longest a tendril grows
export const SNAP_STRETCH = 1.35; // snaps back when the pointer is this × MAX_LEN away
export const GROW_SPEED = 900; // px/s
export const RETRACT_SPEED = 1500; // px/s
export const BASE_RADIUS = 9.5; // px, where a tendril leaves the pill (thick)
export const TIP_RADIUS = 3.4; // px (each tip ends in a small bulb)
export const GRAVITY = 420; // px/s², a little sag
export const SPAWN_GAP_MS = 110; // one new tendril at a time

const P = 8; // rope points per tendril
const SUBSTEP = 1 / 120; // s
const MAX_DT = 0.032; // s
const ROPE_DAMP = 0.86; // velocity kept per substep
const TIP_PULL = 0.35; // how hard a reaching tip is drawn to the pointer, per substep
const LATERAL = [0, 26, -26, 50, -50]; // px along the pill's edge, per tendril
const DPR_CAP = 2; // crisp on every screen; the scissor box keeps it cheap
const IDLE_UNMOUNT_MS = 2000;

interface Stats {
  js: number[];
  lat: number[];
  strands?: number;
}

const VERT = `#version 300 es
void main() {
  vec2 p = vec2(float((gl_VertexID << 1) & 2), float(gl_VertexID & 2));
  gl_Position = vec4(p * 2.0 - 1.0, 0.0, 1.0);
}`;

const FRAG = `#version 300 es
precision highp float;
#define S ${MAX_STRANDS}
#define P ${P}
uniform vec2 uRes;    // canvas, CSS px
uniform float uDpr;
uniform float uTime;
uniform vec4 uBtn;    // pill: centre x, y, half width, half height (CSS px, y down)
uniform vec4 uMound;  // bulge toward the pointer: x, y, radius, amount
uniform vec4 uPts[S * P]; // rope points: x, y, radius
uniform vec4 uBox[S];     // tendril bounds (skip pixels far from it)
out vec4 outC;

float sdPill(vec2 p) {
  vec2 q = p - uBtn.xy;
  return length(vec2(max(abs(q.x) - (uBtn.z - uBtn.w), 0.0), q.y)) - uBtn.w;
}
float sdSeg(vec2 p, vec3 a, vec3 b) {
  vec2 pa = p - a.xy, ba = b.xy - a.xy;
  float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-4), 0.0, 1.0);
  return length(pa - ba * h) - mix(a.z, b.z, h);
}
float smin(float a, float b, float k) {
  float h = max(k - abs(a - b), 0.0) / k;
  return min(a, b) - h * h * k * 0.25;
}
float field(vec2 p) {
  float d = sdPill(p);
  // the slime's edge is lumpy and slowly churns
  d += 0.9 * sin(p.x * 0.083 + uTime * 1.5) * sin(p.y * 0.13 - uTime * 1.2)
     + 0.5 * sin(p.x * 0.21 - uTime * 2.1 + p.y * 0.07);
  if (uMound.w > 0.001) d = smin(d, length(p - uMound.xy) - uMound.z, 4.0 + 14.0 * uMound.w);
  for (int s = 0; s < S; s++) {
    vec4 bb = uBox[s];
    if (p.x < bb.x || p.y < bb.y || p.x > bb.z || p.y > bb.w) continue;
    float ds = 1e5;
    for (int j = 0; j < P - 1; j++) ds = min(ds, sdSeg(p, uPts[s * P + j].xyz, uPts[s * P + j + 1].xyz));
    d = smin(d, ds, 16.0); // fat, gooey joins
  }
  return d;
}

const vec3 IVORY = vec3(0.961, 0.941, 0.910);
const vec3 RED = vec3(0.902, 0.220, 0.263);

// a band with crisp edges (a softbox seen in the lacquer)
float band(float x, float c, float w, float soft) { return 1.0 - smoothstep(w - soft, w, abs(x - c)); }

// a small studio: a long softbox above, a tall one to the right, a small
// square key window (the sharp glint), a faint red bounce from below
vec3 env(vec3 R) {
  float top = band(R.y, -0.6, 0.13, 0.04) * band(R.x, 0.0, 0.78, 0.2);
  float side = band(R.x, 0.72, 0.08, 0.03) * band(R.y, -0.1, 0.5, 0.18);
  float key = band(R.x, -0.4, 0.07, 0.02) * band(R.y, -0.56, 0.07, 0.02);
  float low = exp(-pow((R.y - 0.75) / 0.22, 2.0));
  // a broad, dim window: the wet sheen that shows the body's roundness
  float wide = exp(-pow((R.y + 0.35) / 0.4, 2.0)) * exp(-pow(R.x / 0.7, 2.0));
  return IVORY * (3.2 * top + 1.6 * side + 8.0 * key + 0.22 * wide) + RED * 0.3 * low;
}

float hash(vec2 q) { vec3 p3 = fract(vec3(q.xyx) * 0.1031); p3 += dot(p3, p3.yzx + 33.33); return fract((p3.x + p3.y) * p3.z); }
float vnoise(vec2 q) {
  vec2 i = floor(q), f = fract(q);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x), mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}
// slow, swimming bumps on the surface: what makes it read as slime
float slime(vec2 q) {
  return vnoise(q * 0.05 + vec2(uTime * 0.25, -uTime * 0.16)) * 0.75
       + vnoise(q * 0.11 - vec2(uTime * 0.35, uTime * 0.2)) * 0.25;
}

void main() {
  vec2 p = vec2(gl_FragCoord.x, uRes.y * uDpr - gl_FragCoord.y) / uDpr;
  float d = field(p);
  if (d > 1.0 / uDpr) { outC = vec4(0.0); return; }
  // rounded height from the distance: a quarter-circle bevel 12 px wide
  float e = 0.75;
  vec2 g = vec2(field(p + vec2(e, 0.0)) - d, field(p + vec2(0.0, e)) - d) / e;
  // a thick, rounded body: a quarter-circle bevel 16 px wide
  float T = 16.0;
  float x = clamp(-d / T, 0.0, 1.0);
  float slope = (1.0 - x) / max(sqrt(1.0 - (1.0 - x) * (1.0 - x)), 0.12);
  // plus the slime's bumps, strongest on the flatter top
  float s0 = slime(p);
  vec2 sg = vec2(slime(p + vec2(2.0, 0.0)) - s0, slime(p + vec2(0.0, 2.0)) - s0) / 2.0;
  vec3 N = normalize(vec3(g * slope + sg * 4.5, 1.0));
  vec3 R = reflect(vec3(0.0, 0.0, -1.0), N);
  float F = 0.08 + 0.92 * pow(1.0 - N.z, 4.0);
  vec3 col = vec3(0.012) + env(R) * F;
  // soft key on the lacquer
  vec3 H = normalize(normalize(vec3(-0.45, -0.62, 0.64)) + vec3(0.0, 0.0, 1.0));
  float nh = max(dot(N, H), 0.0);
  col += IVORY * pow(nh, 320.0) * 3.0;       // wet, pin-sharp glints
  col += IVORY * pow(nh, 24.0) * 0.06;        // and the slick haze around them
  // a thin light along the upper-left silhouette, like the edge of wet goo
  vec2 nd = N.xy / max(length(N.xy), 1e-4);
  col += IVORY * pow(max(dot(nd, vec2(-0.6, -0.8)), 0.0), 2.0) * smoothstep(0.35, 0.9, 1.0 - N.z) * 0.55;
  col = 1.0 - exp(-col * 1.5);       // keeps highlights crisp, not washed out
  col = pow(col, vec3(1.0 / 2.2));
  float cov = clamp(0.5 - d * uDpr, 0.0, 1.0);
  outC = vec4(col * cov, cov);
}`;

/** Starts the effect; returns its cleanup. Any failure disables it silently. */
export function startWhisperGoo(host: HTMLElement, button: HTMLElement): () => void {
  try {
    return start(host, button);
  } catch {
    return () => undefined;
  }
}

function start(host: HTMLElement, button: HTMLElement): () => void {
  const PAD = ZONE_PADDING;
  const S = MAX_STRANDS;
  const footer = host.closest("footer") ?? host;
  const stats = (window as unknown as { __whisperWebStats?: Stats }).__whisperWebStats;

  // ---- WebGL, prepared up front (shaders compile in the background) ----
  const canvas = document.createElement("canvas");
  canvas.className = "whisper-goo";
  canvas.setAttribute("aria-hidden", "true");
  canvas.style.left = `${-PAD}px`;
  canvas.style.top = `${-PAD}px`;
  const gl = canvas.getContext("webgl2", {
    alpha: true,
    premultipliedAlpha: true,
    antialias: false,
    depth: false,
    stencil: false,
    desynchronized: true,
  });
  if (!gl) return () => undefined;
  const parallel = gl.getExtension("KHR_parallel_shader_compile");
  const shader = (type: number, src: string) => {
    const s = gl.createShader(type);
    if (!s) throw new Error("shader");
    gl.shaderSource(s, src);
    gl.compileShader(s);
    return s;
  };
  const prog = gl.createProgram();
  if (!prog) return () => undefined;
  gl.attachShader(prog, shader(gl.VERTEX_SHADER, VERT));
  gl.attachShader(prog, shader(gl.FRAGMENT_SHADER, FRAG));
  gl.linkProgram(prog);
  let ready = false;
  let failed = false;
  const checkReady = () => {
    if (ready || failed) return ready;
    if (parallel && !gl.getProgramParameter(prog, parallel.COMPLETION_STATUS_KHR)) return false;
    if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
      failed = true;
      return false;
    }
    gl.useProgram(prog);
    ready = true;
    return true;
  };
  const vao = gl.createVertexArray();
  const uRes = gl.getUniformLocation(prog, "uRes");
  const uDpr = gl.getUniformLocation(prog, "uDpr");
  const uTime = gl.getUniformLocation(prog, "uTime");
  const uBtn = gl.getUniformLocation(prog, "uBtn");
  const uMound = gl.getUniformLocation(prog, "uMound");
  const uPts = gl.getUniformLocation(prog, "uPts");
  const uBox = gl.getUniformLocation(prog, "uBox");

  // ---- tendril state, preallocated ----
  const state = new Uint8Array(S); // 0 off, 1 reaching, 2 snapping back
  const len = new Float32Array(S);
  const anx = new Float32Array(S); // anchor on the pill's edge
  const any = new Float32Array(S);
  const pos = new Float32Array(S * P * 2);
  const prv = new Float32Array(S * P * 2);
  const pts = new Float32Array(S * P * 4); // uniform upload: x, y, radius, 0
  const box = new Float32Array(S * 4);

  let pageLeft = 0;
  let pageTop = 0;
  let bw = 0;
  let bh = 0;
  let zw = 0;
  let zh = 0;
  let dpr = 1;
  let px = -1e5;
  let py = -1e5;
  let inputT = 0;
  let drawnInputT = 0;
  let raf = 0;
  let last = 0;
  let acc = 0;
  let time = 0;
  let running = false;
  let mounted = false;
  let shown = false;
  let onScreen = false;
  let listening = false;
  let lastSpawn = 0;
  let mound = 0;
  let unmountTimer = 0;
  let resizeTimer = 0;
  let scrollRaf = 0;
  // pill geometry in canvas coordinates
  let cx = 0;
  let cy = 0;
  let hw = 0;
  let hh = 0;
  // scratch for edge lookups (no allocations in the loop)
  let ex = 0;
  let ey = 0;
  let enx = 0;
  let eny = 0;
  // the part of the canvas kept clear of text and controls (inset, px)
  let clipT = 0;
  let clipR = 0;
  let clipB = 0;
  let clipL = 0;

  /** Keep the goo off every heading, text and control near the button. */
  const computeClip = (left: number, top: number) => {
    clipT = clipR = clipB = clipL = 0;
    const zl = left - PAD;
    const zt = top - PAD;
    const zr = left + bw + PAD;
    const zb = top + bh + PAD;
    footer.querySelectorAll("dl, form, h2, p, a, button, input, textarea").forEach((el) => {
      if (host.contains(el)) return;
      const r = el.getBoundingClientRect();
      if (r.width === 0 || r.right <= zl || r.left >= zr || r.bottom <= zt || r.top >= zb) return;
      if (r.bottom <= top) clipT = Math.max(clipT, r.bottom - zt + 4);
      else if (r.top >= top + bh) clipB = Math.max(clipB, zb - r.top + 4);
      else if (r.left >= left + bw) clipR = Math.max(clipR, zr - r.left + 4);
      else if (r.right <= left) clipL = Math.max(clipL, r.right - zl + 4);
    });
    canvas.style.clipPath = `inset(${clipT}px ${clipR}px ${clipB}px ${clipL}px)`;
  };

  /** Nearest point on the pill's edge to (x, y), with its outward normal. */
  const edge = (x: number, y: number) => {
    const a = hw - hh;
    let ox = x - cx;
    if (ox < -a) ox = -a;
    else if (ox > a) ox = a;
    let dx = x - cx - ox;
    let dy = y - cy;
    const l = Math.sqrt(dx * dx + dy * dy);
    if (l < 0.001) {
      dx = 0;
      dy = -1;
    } else {
      dx /= l;
      dy /= l;
    }
    ex = cx + ox + dx * hh;
    ey = cy + dy * hh;
    enx = dx;
    eny = dy;
    return l - hh; // distance from the edge (negative inside)
  };

  const measure = () => {
    const r = button.getBoundingClientRect();
    pageLeft = r.left + window.scrollX;
    pageTop = r.top + window.scrollY;
    const w = button.offsetWidth;
    const h = button.offsetHeight;
    const d = Math.min(DPR_CAP, window.devicePixelRatio || 1);
    if (w !== bw || h !== bh || d !== dpr) {
      bw = w;
      bh = h;
      dpr = d;
      zw = bw + 2 * PAD;
      zh = bh + 2 * PAD;
      cx = PAD + bw / 2;
      cy = PAD + bh / 2;
      hw = bw / 2;
      hh = bh / 2;
      canvas.width = Math.round(zw * dpr);
      canvas.height = Math.round(zh * dpr);
      canvas.style.width = `${zw}px`;
      canvas.style.height = `${zh}px`;
    }
    computeClip(r.left, r.top);
  };

  const mount = () => {
    if (mounted) return;
    mounted = true;
    host.insertBefore(canvas, host.firstChild);
  };
  const unmount = () => {
    if (!mounted) return;
    mounted = false;
    shown = false;
    host.classList.remove("is-goo");
    canvas.remove();
  };

  const spawn = (k: number, lx: number, ly: number) => {
    // anchor: on the edge facing the pointer, shifted along it by LATERAL[k]
    edge(lx, ly);
    const tx = -eny;
    const ty = enx;
    edge(ex + tx * LATERAL[k], ey + ty * LATERAL[k]);
    anx[k] = ex - enx * 4;
    any[k] = ey - eny * 4;
    for (let i = 0; i < P; i += 1) {
      const o = (k * P + i) * 2;
      pos[o] = prv[o] = anx[k];
      pos[o + 1] = prv[o + 1] = any[k];
    }
    len[k] = 0;
    state[k] = 1;
  };

  const frame = (now: number) => {
    const t0 = performance.now();
    let dt = (now - last) / 1000;
    last = now;
    if (dt > MAX_DT) dt = MAX_DT;
    else if (dt < 0) dt = 0;
    time += dt;

    let lx = px - (pageLeft - window.scrollX) + PAD;
    let ly = py - (pageTop - window.scrollY) + PAD;
    const inside = lx >= 0 && ly >= 0 && lx <= zw && ly <= zh;
    // tendrils reach only into the part of the canvas that shows
    if (lx < clipL + 8) lx = clipL + 8;
    else if (lx > zw - clipR - 8) lx = zw - clipR - 8;
    if (ly < clipT + 8) ly = clipT + 8;
    else if (ly > zh - clipB - 8) ly = zh - clipB - 8;
    const dist = edge(lx, ly);
    // reaching only from outside the pill: hovering, clicking or listening,
    // the pill keeps its clean shape
    const aware = inside && dist > 6 && dist < AWARENESS && voiceState().status !== "playing";
    const close = aware ? 1 - Math.max(0, dist) / AWARENESS : 0;
    // the surface swells toward the pointer
    const mx = ex + enx * (3 + 5 * close);
    const my = ey + eny * (3 + 5 * close);

    // how many tendrils: more the closer the pointer is
    let reaching = 0;
    for (let k = 0; k < S; k += 1) if (state[k] === 1) reaching += 1;
    const want = aware ? 1 + Math.floor(close * (S - 1) + 0.5) : 0;
    if (reaching < want && now - lastSpawn > SPAWN_GAP_MS) {
      for (let k = 0; k < S; k += 1) {
        if (state[k] === 0) {
          spawn(k, lx, ly);
          lastSpawn = now;
          break;
        }
      }
    } else if (reaching > want) {
      for (let k = S - 1; k >= 0; k -= 1) {
        if (state[k] === 1) {
          state[k] = 2;
          break;
        }
      }
    }

    // rope physics in fixed substeps
    acc += dt;
    let active = 0;
    while (acc >= SUBSTEP) {
      acc -= SUBSTEP;
      mound += ((aware ? close : 0) - mound) * 0.08;
      for (let k = 0; k < S; k += 1) {
        if (state[k] === 0) continue;
        const ax = anx[k];
        const ay = any[k];
        let target = 0;
        if (state[k] === 1) {
          const dx = lx - ax;
          const dy = ly - ay;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (!aware || d > MAX_LEN * SNAP_STRETCH) state[k] = 2;
          else target = d < MAX_LEN ? d : MAX_LEN;
        }
        if (len[k] < target) len[k] = Math.min(target, len[k] + GROW_SPEED * SUBSTEP);
        else len[k] = Math.max(target, len[k] - (state[k] === 2 ? RETRACT_SPEED : GROW_SPEED) * SUBSTEP);
        if (state[k] === 2 && len[k] < 1) {
          state[k] = 0;
          continue;
        }
        const seg = len[k] / (P - 1);
        const base = k * P * 2;
        pos[base] = prv[base] = ax;
        pos[base + 1] = prv[base + 1] = ay;
        for (let i = 1; i < P; i += 1) {
          const o = base + i * 2;
          const vx = (pos[o] - prv[o]) * ROPE_DAMP;
          const vy = (pos[o + 1] - prv[o + 1]) * ROPE_DAMP;
          prv[o] = pos[o];
          prv[o + 1] = pos[o + 1];
          pos[o] += vx;
          pos[o + 1] += vy + GRAVITY * SUBSTEP * SUBSTEP * (i / (P - 1));
        }
        if (state[k] === 1) {
          // each tip latches a little beside the pointer (the fingers fan
          // out) and slithers slightly
          const o = base + (P - 1) * 2;
          let fx = lx - ax;
          let fy = ly - ay;
          const fl = Math.sqrt(fx * fx + fy * fy) || 1;
          fx /= fl;
          fy /= fl;
          const side = LATERAL[k] * 0.32 + Math.sin(time * 3.1 + k * 2.3) * 4;
          pos[o] += (lx - fy * side - pos[o]) * TIP_PULL;
          pos[o + 1] += (ly + fx * side - pos[o + 1]) * TIP_PULL;
        }
        for (let it = 0; it < 3; it += 1) {
          for (let i = 0; i < P - 1; i += 1) {
            const a = base + i * 2;
            const b = a + 2;
            const dx = pos[b] - pos[a];
            const dy = pos[b + 1] - pos[a + 1];
            const d = Math.sqrt(dx * dx + dy * dy) || 1e-4;
            const diff = (d - seg) / d;
            if (i === 0) {
              pos[b] -= dx * diff;
              pos[b + 1] -= dy * diff;
            } else {
              pos[a] += dx * diff * 0.5;
              pos[a + 1] += dy * diff * 0.5;
              pos[b] -= dx * diff * 0.5;
              pos[b + 1] -= dy * diff * 0.5;
            }
          }
        }
      }
    }

    // upload: points with tapering radius (thinner when stretched), bounds
    for (let k = 0; k < S; k += 1) {
      const b4 = k * 4;
      if (state[k] === 0 || len[k] < 0.5) {
        box[b4] = box[b4 + 1] = 1e5;
        box[b4 + 2] = box[b4 + 3] = -1e5;
        continue;
      }
      active += 1;
      const thin = len[k] > 70 ? Math.max(0.7, Math.sqrt(70 / len[k])) : 1;
      let x0 = 1e5;
      let y0 = 1e5;
      let x1 = -1e5;
      let y1 = -1e5;
      for (let i = 0; i < P; i += 1) {
        const o = (k * P + i) * 2;
        const q = (k * P + i) * 4;
        const t = i / (P - 1);
        // thick root, thinning neck, a bulb at the tip; slow swallowing
        // ripples travel out along it
        const bulb = t > 0.8 ? (t - 0.8) * 7 : 0;
        const ripple = 1 + 0.16 * Math.sin(time * 7 - i * 1.25 + k * 1.9) * (0.3 + t);
        const r = (BASE_RADIUS + (TIP_RADIUS - BASE_RADIUS) * Math.sqrt(t) + bulb) * thin * ripple;
        pts[q] = pos[o];
        pts[q + 1] = pos[o + 1];
        pts[q + 2] = r;
        if (pos[o] < x0) x0 = pos[o];
        if (pos[o] > x1) x1 = pos[o];
        if (pos[o + 1] < y0) y0 = pos[o + 1];
        if (pos[o + 1] > y1) y1 = pos[o + 1];
      }
      box[b4] = x0 - BASE_RADIUS - 18;
      box[b4 + 1] = y0 - BASE_RADIUS - 18;
      box[b4 + 2] = x1 + BASE_RADIUS + 18;
      box[b4 + 3] = y1 + BASE_RADIUS + 18;
    }

    // draw only inside the goo's bounds (most of the canvas is empty)
    let sx0 = cx - hw - 24;
    let sy0 = cy - hh - 24;
    let sx1 = cx + hw + 24;
    let sy1 = cy + hh + 24;
    for (let k = 0; k < S; k += 1) {
      const b4 = k * 4;
      if (box[b4] > box[b4 + 2]) continue;
      if (box[b4] < sx0) sx0 = box[b4];
      if (box[b4 + 1] < sy0) sy0 = box[b4 + 1];
      if (box[b4 + 2] > sx1) sx1 = box[b4 + 2];
      if (box[b4 + 3] > sy1) sy1 = box[b4 + 3];
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.enable(gl.SCISSOR_TEST);
    const scX = Math.max(0, Math.floor(sx0 * dpr));
    const scY = Math.max(0, Math.floor((zh - sy1) * dpr));
    gl.scissor(scX, scY, Math.max(0, Math.ceil(sx1 * dpr) - scX), Math.max(0, Math.ceil((zh - sy0) * dpr) - scY));
    gl.uniform2f(uRes, zw, zh);
    gl.uniform1f(uDpr, dpr);
    gl.uniform1f(uTime, time);
    gl.uniform4f(uBtn, cx, cy, hw, hh);
    gl.uniform4f(uMound, mx, my, 1 + 9 * mound, mound);
    gl.uniform4fv(uPts, pts);
    gl.uniform4fv(uBox, box);
    gl.bindVertexArray(vao);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    if (!shown) {
      // the drawn pill takes over from the CSS one
      shown = true;
      host.classList.add("is-goo");
    }

    if (stats) {
      stats.js.push(performance.now() - t0);
      stats.strands = active;
      if (inputT !== drawnInputT) {
        stats.lat.push(performance.now() - inputT);
        drawnInputT = inputT;
      }
    }

    if (!inside && active === 0 && mound < 0.01) {
      // at rest: keep the last frame (the pill) for a moment, then hand back
      running = false;
      window.clearTimeout(unmountTimer);
      unmountTimer = window.setTimeout(unmount, IDLE_UNMOUNT_MS);
      return;
    }
    raf = requestAnimationFrame(frame);
  };

  const begin = () => {
    if (!checkReady()) return;
    window.clearTimeout(unmountTimer);
    measure();
    mount();
    running = true;
    last = performance.now();
    acc = 0;
    raf = requestAnimationFrame(frame);
  };

  const halt = () => {
    running = false;
    cancelAnimationFrame(raf);
    state.fill(0);
    len.fill(0);
    mound = 0;
    unmount();
  };

  const inZone = () => {
    const l = pageLeft - window.scrollX;
    const t = pageTop - window.scrollY;
    return px >= l - PAD && px <= l + bw + PAD && py >= t - PAD && py <= t + bh + PAD;
  };

  const onMove = (e: PointerEvent) => {
    if (e.pointerType === "touch") return;
    let x = e.clientX;
    let y = e.clientY;
    const predicted = e.getPredictedEvents?.();
    if (predicted && predicted.length > 0) {
      x = predicted[predicted.length - 1].clientX;
      y = predicted[predicted.length - 1].clientY;
    }
    px = x;
    py = y;
    inputT = e.timeStamp;
    if (!running && onScreen && !document.hidden && inZone()) begin();
  };
  const onLeaveWindow = () => {
    px = -1e5;
    py = -1e5;
  };
  const onScroll = () => {
    if (scrollRaf) return;
    scrollRaf = requestAnimationFrame(() => {
      scrollRaf = 0;
      measure();
    });
  };
  const listen = (on: boolean) => {
    if (on === listening) return;
    listening = on;
    if (on) {
      window.addEventListener("pointermove", onMove, { passive: true });
      window.addEventListener("scroll", onScroll, { passive: true });
      document.documentElement.addEventListener("mouseleave", onLeaveWindow, { passive: true });
    } else {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("scroll", onScroll);
      document.documentElement.removeEventListener("mouseleave", onLeaveWindow);
    }
  };
  const onVisibility = () => {
    if (document.hidden) halt();
  };
  const onLost = (e: Event) => {
    e.preventDefault();
    failed = true;
    halt();
    listen(false);
  };

  host.style.isolation = "isolate";
  measure();
  canvas.addEventListener("webglcontextlost", onLost);

  const io = new IntersectionObserver(
    ([e]) => {
      onScreen = e.isIntersecting;
      listen(onScreen && !failed);
      if (onScreen) measure();
      else halt();
    },
    { rootMargin: "150px 0px" }
  );
  io.observe(host);
  const ro = new ResizeObserver(() => {
    window.clearTimeout(resizeTimer);
    resizeTimer = window.setTimeout(measure, 100);
  });
  ro.observe(footer);
  ro.observe(button);
  document.addEventListener("visibilitychange", onVisibility);

  return () => {
    io.disconnect();
    ro.disconnect();
    listen(false);
    document.removeEventListener("visibilitychange", onVisibility);
    canvas.removeEventListener("webglcontextlost", onLost);
    cancelAnimationFrame(raf);
    cancelAnimationFrame(scrollRaf);
    window.clearTimeout(unmountTimer);
    window.clearTimeout(resizeTimer);
    running = false;
    unmount();
    host.style.removeProperty("isolation");
    gl.getExtension("WEBGL_lose_context")?.loseContext();
  };
}
