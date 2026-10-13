# Gourang Lokwani — Marketing Portfolio

Single-page portfolio built with Vite 5, React 18, TypeScript, Tailwind 3,
three.js / React Three Fiber and framer-motion.

## Develop

```bash
npm install
npm run dev
```

```bash
npm run build     # also regenerates public/sitemap.xml + robots.txt (prebuild)
npm run preview
```

## Deploy (Vercel)

Live at https://gouranglokwani.vercel.app. The Vercel project is connected to
this (private) GitHub repo: every push to `main` deploys automatically.
Environment variables live in Vercel → Project → Settings → Environment
Variables; redeploy after changing them.

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Purpose |
| --- | --- |
| `VITE_WEB3FORMS_KEY` | Contact-form delivery to Gmail via Web3Forms. |
| `VITE_SITE_URL` | Public URL used by canonical, Open Graph, JSON-LD and the sitemap. Defaults to `https://gouranglokwani.vercel.app`. |

### Contact form

Primary sender: **FormSubmit** (no API key) — endpoint in `src/data/site.ts`
(`contactEndpoint`). The first submission emails gouranglokwani27@gmail.com an
"Activate Form" link; click it once and every enquiry is forwarded. After
activation you can replace the address in `contactEndpoint` with the random
alias FormSubmit shows, to hide it.

Optional backup: **Web3Forms**, used only if `VITE_WEB3FORMS_KEY` is set (in
`.env.local` and in Vercel's Environment Variables, then redeploy).

If both fail, the form offers "Email me instead" (pre-filled mailto) and
"Copy message". Tests (network mocked): `npm run test:contact`.
