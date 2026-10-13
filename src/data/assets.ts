/**
 * Single source of truth for every shipped attachment path.
 * Components must never hard-code an asset path — always import from here.
 * Empty string means "asset not provided" and the UI must hide that element.
 */
export const assets = {
  /** Hero 3D billboard texture — bright red "IT'S ALL MARKETING." artwork (4:1). */
  billboard: "/assets/billboard-its-all-marketing.png",
  /** Résumé PDF — hero "Get Resume" button. */
  resume: "/assets/Gourang_Lokwani_Resume.pdf",
  /** Project 01 logo — Dip N Sip (deep forest-green square). */
  logoDipNSip: "/assets/logo-dipnsip.png",
  /** Project 02 logo — Wrepd (white background artwork). */
  logoWrepd: "/assets/logo-wrepd.png",
  /** Project 03 logo — Synkk (pure black square). */
  logoSynkk: "/assets/logo-synkk.png",
  /** Project 04 logo — Inayat (charcoal background artwork). */
  logoInayat: "/assets/logo-inayat.png",
  /** Experience 01 certificate — HLBS Tech internship certificate (portrait PNG). */
  certHlbs: "/assets/cert-hlbs.png",
  /** Experience 02 certificate — Gyayak Marketing completion letter (PDF). */
  certGyayak: "/assets/cert-gyayak.pdf",
} as const;

export type Assets = typeof assets;
