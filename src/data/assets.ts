/**
 * Single source of truth for every shipped attachment path.
 * Components must never hard-code an asset path — always import from here.
 * Empty string means "asset not provided" and the UI must hide that element.
 * Paths are prefixed with the build's base URL so the site also works when
 * hosted under a sub-path (e.g. GitHub Pages: /repo-name/).
 */
const base = import.meta.env.BASE_URL;

export const assets = {
  /** Hero 3D billboard texture — bright red "IT'S ALL MARKETING." artwork (4:1). */
  billboard: `${base}assets/billboard-its-all-marketing.png`,
  /** Résumé PDF — hero "Get Resume" button. */
  resume: `${base}assets/Gourang_Lokwani_Resume.pdf`,
  /** Project 01 logo — Dip N Sip (deep forest-green square). */
  logoDipNSip: `${base}assets/logo-dipnsip.png`,
  /** Project 02 logo — Wrepd (white background artwork). */
  logoWrepd: `${base}assets/logo-wrepd.png`,
  /** Project 03 logo — Synkk (pure black square). */
  logoSynkk: `${base}assets/logo-synkk.png`,
  /** Project 04 logo — Inayat (charcoal background artwork). */
  logoInayat: `${base}assets/logo-inayat.png`,
  /** Experience 01 certificate — HLBS Tech internship certificate (portrait PNG). */
  certHlbs: `${base}assets/cert-hlbs.png`,
  /** Experience 02 certificate — Gyayak Marketing completion letter (PDF). */
  certGyayak: `${base}assets/cert-gyayak.pdf`,
} as const;

export type Assets = typeof assets;
