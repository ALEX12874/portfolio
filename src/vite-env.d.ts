/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Web3Forms public access key for the contact form (see .env.example). */
  readonly VITE_WEB3FORMS_KEY?: string;
  /** Optional Formspree form id — backup sender if Web3Forms fails. */
  readonly VITE_FORMSPREE_ID?: string;
  /** Canonical site URL, e.g. https://gouranglokwani.vercel.app */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
