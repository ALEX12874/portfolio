/**
 * Single source of truth for every shipped attachment.
 * Components must never hard-code an asset path — always import from here.
 * Empty string means "asset not provided" and the UI must hide that element.
 *
 * Rasters are shipped as WebP (scripts/optimize-images.mjs).
 * Files live in src/assets and are imported, so Vite fingerprints them and
 * ships them with the build — they can never 404 or depend on public/ paths.
 */
import billboard from "../assets/billboard-its-all-marketing.webp";
import resume from "../assets/gourang-lokwani-resume.pdf?url";
import logoDipNSip from "../assets/logo-dipnsip.webp";
import logoWrepd from "../assets/logo-wrepd.webp";
import logoSynkk from "../assets/logo-synkk.webp";
import logoInayat from "../assets/logo-inayat.webp";
import certHlbs from "../assets/cert-hlbs.webp";
import certGyayak from "../assets/cert-gyayak.pdf?url";
// original PNG, referenced only by the Download button (never preloaded)
import certHlbsOriginal from "../assets/cert-hlbs.png?url";

export const assets = {
  /** Hero 3D billboard texture — bright red "IT'S ALL MARKETING." artwork (4:1). */
  billboard,
  /** Résumé PDF — hero "Get Resume" button. */
  resume,
  /** Project 01 logo — Dip N Sip (deep forest-green square). */
  logoDipNSip,
  /** Project 02 logo — Wrepd (white background artwork). */
  logoWrepd,
  /** Project 03 logo — Synkk (pure black square). */
  logoSynkk,
  /** Project 04 logo — Inayat (charcoal background artwork). */
  logoInayat,
  /** Experience 01 certificate — HLBS Tech internship certificate (portrait PNG). */
  certHlbs,
  /** Experience 02 certificate — Gyayak Marketing completion letter (PDF). */
  certGyayak,
  /** Full-quality PNG of the HLBS certificate, for "Download" only. */
  certHlbsOriginal,
} as const;

/** Friendly filename for the résumé download (the shipped file is hashed). */
export const RESUME_FILENAME = "Gourang_Lokwani_Resume.pdf";

export type Assets = typeof assets;
