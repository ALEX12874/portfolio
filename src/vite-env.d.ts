/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional Web3Forms key: backup sender for the contact form. */
  readonly VITE_WEB3FORMS_KEY?: string;
  /** Canonical site URL, e.g. https://gouranglokwani.in */
  readonly VITE_SITE_URL?: string;
  /** "1" once Vercel Web Analytics is enabled for the project. */
  readonly VITE_ENABLE_ANALYTICS?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
