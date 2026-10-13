/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Optional Web3Forms key: backup sender for the contact form. */
  readonly VITE_WEB3FORMS_KEY?: string;
  /** Canonical site URL, e.g. https://gouranglokwani.vercel.app */
  readonly VITE_SITE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
