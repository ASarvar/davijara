# Davijara.uz

Single state portal for leasing state-owned property in Uzbekistan — operated
by the Davlat mulki obyektlaridan foydalanish markazi.

Next.js 16 · React 19.2 · TypeScript · Tailwind CSS v4 · shadcn/ui · next-intl

---

## Getting started

Requires **Node 20.9+**. (Node 22.13+ or 24 is recommended — some tooling in
the dependency tree declares `^22.13.0`, and 22.12 emits an engine warning.)

```bash
npm install
npm run dev
```

Open <http://localhost:3000> — it redirects to `/uz`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` | Production build |
| `npm run start` | Serve the production build |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run lint` | ESLint |

To measure a production bundle while a dev server is running, build into a
separate directory — otherwise `next dev` and `next build` both write to
`.next` and the numbers get mixed:

```bash
NEXT_DIST_DIR=.next-prod npm run build
```

## Project layout

```
src/
  app/[locale]/     routes (layout.tsx is the root layout)
  components/
    layout/         topbar, navbar, footer, Section/Container primitives
    sections/       page sections
    ui/             shadcn/ui components
  content/          typed source content
  lib/data/         data access layer — the seam for a future API
  i18n/             locale routing + request config
  proxy.ts          locale negotiation (Next 16 renamed middleware -> proxy)
messages/           uz.json + partial ru/en
legacy/             the original static HTML site, kept as reference
```

## Languages

Three locales — `uz` (default), `ru`, `en` — always prefixed in the URL.

Uzbek is the source language. `ru.json` and `en.json` are deliberately partial:
only unambiguous UI chrome is translated, and any missing key falls back to
Uzbek. **Statutory content is never machine-translated** — see `CLAUDE.md`.

## Architecture notes

- **Two surface tones, not light/dark.** `<Section tone="deep" | "light">` sets
  `data-tone`, which re-binds the semantic colour tokens for that subtree.
  Components style with semantic utilities and adapt automatically.
- **Server Components by default.** The homepage ships no page-level JS; the
  search widget is a native GET form and the privileges filter is plain links
  to statically prerendered routes.
- **Content behind a data layer.** Components never import `src/content/`
  directly, so a real API can be swapped in without touching the UI.

## Deploying

Static output for all routes across three locales; any Node host or Vercel
works. Security headers (CSP, HSTS, `X-Frame-Options`, `Permissions-Policy`)
are set in `next.config.ts` — if you deploy behind a proxy that also sets
headers, make sure they aren't duplicated.

Set `NEXT_PUBLIC_SITE_URL` in production so canonical URLs, `hreflang`
alternates and the sitemap resolve to the real domain. See `.env.example`.
