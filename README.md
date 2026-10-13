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

## Environment variables

Copy `.env.example` to `.env.local` and fill in:

| Variable | Purpose |
| --- | --- |
| `VITE_WEB3FORMS_KEY` | Contact-form delivery to Gmail via Web3Forms. |
| `VITE_SITE_URL` | Public URL used by canonical, Open Graph, JSON-LD and the sitemap. Defaults to `https://gouranglokwani.vercel.app`. |

### Contact form key (Web3Forms)

Get a free key at [web3forms.com](https://web3forms.com) by entering
**gouranglokwani27@gmail.com**; the key is emailed to you. Add it in
`.env.local` and in the hosting dashboard's Environment Variables, then
redeploy. The key is public by design (it can only send mail to that inbox),
but it is still kept out of the repository.

Without a key the form shows its error state with a `mailto:` fallback, and a
single warning is logged to the dev console.

The sender lives in `src/lib/sendEnquiry.ts` behind one function, so it can be
swapped for a serverless route later without touching the form UI.
