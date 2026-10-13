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

## Deploy (GitHub Pages)

`.github/workflows/deploy.yml` builds and publishes the site on every push to
`main`. One-time setup on github.com, in the repository:

1. **Settings → Pages → Build and deployment → Source: GitHub Actions.**
2. **Actions** tab → *Deploy to GitHub Pages* → **Run workflow** (or push).

The live address is `https://<username>.github.io/<repo-name>/`, or
`https://<username>.github.io/` if the repo is named `<username>.github.io`.
The workflow works out the base path and site URL automatically.

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
redeploy. On GitHub Pages: Settings → Secrets and variables → Actions →
New repository secret `VITE_WEB3FORMS_KEY`, then re-run the deploy workflow. The key is public by design (it can only send mail to that inbox),
but it is still kept out of the repository.

Without a key the form shows its error state with a `mailto:` fallback, and a
single warning is logged to the dev console.

The sender lives in `src/lib/sendEnquiry.ts` behind one function, so it can be
swapped for a serverless route later without touching the form UI.
