@AGENTS.md

# Davijara.uz

Uzbekistan's single state portal for leasing state-owned property, operated by
the **Davlat mulki obyektlaridan foydalanish markazi** under the State Assets
Management Agency. Citizens and businesses use it to browse vacant state
property, bid via E-auksion, sign lease contracts, and look up statutory rent
privileges.

**This is a government portal.** Accuracy and accessibility outrank velocity.
Do not invent facts, figures, addresses, or legal references. If a value cannot
be verified, leave it out and say so rather than filling the gap.

## Stack

Next.js 16 (App Router, Turbopack default for dev *and* build) · React 19.2 ·
TypeScript strict · Tailwind CSS v4 (CSS-first, **no `tailwind.config.js`**) ·
shadcn/ui on Radix · next-intl 4 · React Compiler (enabled).

Two Next.js 16 renames that trip up training data:

- Middleware is now **Proxy** — the file is `src/proxy.ts`, not `middleware.ts`.
- `params` and `searchParams` are **async** and must be awaited.

Read `node_modules/next/dist/docs/` before writing Next-specific code.

## Commands

```bash
npm run dev         # Turbopack dev server
npm run build       # production build
npm run typecheck   # tsc --noEmit
npm run lint        # eslint

# Measure a production bundle without a running dev server polluting .next:
NEXT_DIST_DIR=.next-prod npm run build
```

## Non-negotiables

### 1. Statutory content is verbatim

`src/content/privileges.ts` holds 24 rent privileges, each citing binding Uzbek
legal acts (PQ-239, PF-93, VM-626, PQ-3782 …). It was extracted mechanically
from the legacy markup and verified byte-for-byte against the source.

**Never** reword, reformat, summarise, "improve", or machine-translate any
field — `legalBasis` above all. Corrections come from the source legislation,
not from editing prose here. The same applies to `messages/ru.json` and
`messages/en.json`: UI chrome may be translated, legal text may not.

### 2. Components consume semantic tokens, never raw brand colours

The site is **not** light/dark themed. It is one fixed palette with two surface
tones that alternate down the page:

```tsx
<Section tone="deep">   {/* navy #07102b — the default */}
<Section tone="light">  {/* bone #f4f2ee */}
```

`tone` sets `data-tone` on the section, which re-binds every semantic colour
token for the whole subtree (see `src/app/globals.css`). Descendants adapt with
no props of their own — *provided* they style with `bg-card`,
`text-muted-foreground`, `border-border` and friends.

Reaching for `bg-navy` or `text-gold` directly breaks the tone flip and will
look wrong in one of the two contexts.

**Gold is not a text colour on light surfaces.** `#c8a96e` on `#f4f2ee` is
2.01:1 — a hard WCAG AA failure. Use `--color-gold-ink` (`#7d6229`, 5.14:1)
for gold-toned text on light, or just use `text-accent-foreground`, which
already resolves to the correct one per tone.

### 3. Server Components by default

The homepage ships **no page-level JavaScript**. Only add `"use client"` when
something genuinely needs the browser:

| Component | Why it's a client component |
|---|---|
| `nav-links` | reads pathname for the active item |
| `mobile-nav` | Sheet open/close state |
| `lang-switcher` | reads pathname to preserve position across locales |
| `privilege-list` | Accordion expand/collapse (one boundary over 24 items, not 24 islands) |
| `rent-calculator` | recomputes as the range input is dragged |
| `bottom-nav` | reads pathname for the active item |
| `scroll-to-top` | scroll position listener |
| `accessibility-controls` | reads/writes `data-contrast` + `data-text-size` on `<html>` |
| `accessibility-dialog` | Dialog open/close state for the topbar trigger |

Scroll reveals are **not** a reason to add `"use client"` — they are pure CSS.

Filtering and search state belong in the **URL**, not React state. The
privileges filter is a set of links to real routes (`/imtiyozlar/it`), not a
click handler — so each view is linkable, back-button-correct, statically
prerendered, and crawlable. The homepage search is a real GET form targeting
`/obyektlar`, so results stay addressable as `?hudud=&tur=&maydon=&narx=` and
a search can be linked and indexed. Its dropdowns are shadcn's `Select`
(Radix, client JS), not native `<select>` elements — a deliberate trade of the
former zero-JS approach so the open dropdown panel can carry the site's
rounded/gold-bordered styling, which Chromium won't apply to a native
`<select>` popup. Radix's hidden bubble `<select>` still submits `name=value`
on the form, so GET submission needs no `onSubmit` handler of our own.

### 4. Content flows through the data layer

Components must not import from `src/content/` directly. Read through
`src/lib/data/` (`getPrivileges()`, `getListings()`, `getRegions()` …). Those
functions are `async` even though they currently read local modules, so a real
API can replace their bodies without touching a single component.

Derived values stay derived: privilege category counts are computed from the
data, never typed into markup.

## Header

`layout/site-header.tsx` is one component, not a topbar stacked on a navbar.
The brand occupies a tall left column and the two rows stack to its right:

```
┌───────┬──────────────── phone · email · a11y · lang ──┐
│ LOGO  ├───────────────────────────────────────────────┤
└───────┴─ nav links ─────────────────────── Kirish ────┘
```

This is a two-column grid with the brand explicitly placed across both rows —
which is *why* the old topbar and navbar had to merge: the logo must be a
sibling of both rows to span them.

**The full layout starts at `xl`, not `lg`, and that is measured rather than
arbitrary.** The seven nav labels are long in Uzbek and total 782px; with the
brand column, the Kirish button, gaps and gutters the row needs **~1214px**.
At `lg` (1024px) it overflowed the viewport by ~160px, because a `1fr` grid
track defaults to `min-width: auto` and will not shrink below its content.
Tracks are therefore `minmax(0, 1fr)`, and 1024–1279px uses the sheet menu.

If you add a nav item, re-measure. The margin at 1280px is only ~48px.

Responsive steps, all verified for overflow at 375 / 640 / 768 / 1024 / 1280:

| Width | Logo | Nav |
|---|---|---|
| `< sm` | mark, 30px | sheet |
| `sm`–`xl` | wordmark, 163px | sheet |
| `≥ xl` | wordmark, 218px | full row + Kirish |

The logo's file swap (`<picture>` media) and its size steps use *different*
breakpoints on purpose — the mark exists to save space on a 375px header, but
the wordmark fits comfortably from `sm`, long before the nav does.

On a handset the utility strip must stay on one line or the sticky header eats
~130px, so the email is hidden below `sm` and the accessibility trigger goes
icon-only — with `sr-only` text, never an unlabelled icon.

## Shared primitives

`src/components/common/` holds the deduplicated building blocks. Reach for
these before writing a new card or icon tile — the same shapes were previously
copy-pasted across nine section files with drifting radii and three different
hover treatments.

| Primitive | Use |
|---|---|
| `SurfaceCard` | every card surface; `interactive` adds the hover lift |
| `IconTile` | the accent tile behind a section icon (`sm`/`md`/`lg`) |
| `ActionLink` | "see all →" links; animates the underline and arrow |
| `Eyebrow` | uppercase label; `as="h2"` when it IS the section's heading |
| `StatList` | figure + label grid (hero, impact band) |
| `SelectField` | labelled native `<select>` with a visible chevron |

**Native `<select>` needs two things or it breaks.** `appearance-none` removes
the dropdown arrow, so a replacement chevron must be drawn (with
`pointer-events-none`) or the control looks like a plain text input. And the
option popup inherits `color` from the select while the UA paints its own
background — white-on-white on a dark surface. `color-scheme` is bound to the
tone in `globals.css` to fix that at the root; use `SelectField` and both are
handled.

`src/components/common/placeholder/` holds inline-SVG imagery. These are
**abstract architectural motifs, never photographs** — a photo on a listing
card reads as a photo *of that property*, which we cannot support for a state
asset. They are inline SVG so they inherit the tone tokens, cost no request,
and need no `next/image` config.

Note `ui/` is still shadcn CLI output — do not hand-edit it, and do not put
project primitives there.

## Motion

All CSS. **No animation library, and no section is a client component** — the
homepage still ships zero page-level JavaScript.

- `data-reveal="up|fade|scale"` — scroll reveal via `animation-timeline: view()`.
  Stagger with an inline `--i`.
- `data-enter` with `--enter-delay` — time-based entrance for above-the-fold
  content.

**Two rules that are load-bearing, not stylistic:**

1. **Never write `opacity: 0` as a static declaration to hide something an
   animation will reveal.** Put the hidden state in the keyframe's `from` and
   let `animation-fill-mode: both` apply it. If the timeline turns out to be
   inactive at runtime — which `@supports` cannot predict — the animation then
   produces no output and the content is simply visible, instead of being
   stranded invisible forever.
2. **`data-enter` animates transform only, never opacity.** Its document
   timeline is *active but frozen at 0* in a background tab, and a frozen
   active timeline still applies the `from` keyframe. Fading here would hide
   the hero headline from anyone opening the page in a background tab, and
   from search-engine and print renderers. `data-reveal` does not have this
   problem because its timeline goes *inactive* rather than frozen.

The word-rotator's delays are negative for the same reason — see the comment in
`globals.css`.

## Layout of the repo

```
src/
  app/[locale]/        routes; layout.tsx is the root layout (has <html>)
  components/
    layout/            chrome: topbar, navbar, footer, section primitives
    sections/          page sections
    ui/                shadcn — regenerated by the CLI, avoid hand-editing
  content/             typed source content
  lib/data/            data access; the seam for a future API
  i18n/                routing, navigation, request config
  types/content.ts     content interfaces
messages/              uz.json (source of truth) + ru/en partials
legacy/                the original static site — READ-ONLY reference
scripts/               one-off migration scripts
```

## i18n

Locales `uz` (default) / `ru` / `en`, always prefixed (`/uz/imtiyozlar`).

- Import `Link`, `usePathname`, `useRouter` from `@/i18n/navigation`, never
  from `next/link` — the plain versions drop the locale prefix.
- All UI strings go in `messages/`. `ru.json` and `en.json` are partial by
  design; `src/i18n/request.ts` deep-merges them over `uz.json`, so a missing
  key falls back to Uzbek instead of rendering a raw key.
- `NextIntlClientProvider` receives only the `nav`, `common` and `topbar`
  namespaces — the three client components' needs. Do not widen this to the
  whole catalog; everything else resolves on the server.

## Known source-data issues

Carried over from the legacy site and resolved as follows:

- **Address** — `index.html` said "Buxoro ko'chasi 6", `imtiyozlar.html` said
  "Islom Karimov ko'chasi 55". Confirmed as **Buxoro ko'chasi 6**; single
  source of truth in `content/site.ts`.
- **Footer links** — the two pages listed different domains. Reconciled;
  `online-yanki.uz` dropped (does not resolve), `e-auktsion.uz` normalised to
  `e-auksion.uz`.
- **Regions** — the legacy map array had 13 entries while the hero claimed 14.
  Toshkent shahri was missing; added.
- **Statistics** — confirmed by the operator as real figures, carried verbatim.
- **Listing photos** — the legacy page showed one hotlinked image on all three
  cards. Cards render a branded placeholder until real self-hosted photography
  exists; `aspect-video` reserves the box so adding images causes no shift.

## Accessibility mode

"Maxsus imkoniyatlar" opens as a **dialog from the topbar**, not a route —
the user changes contrast or text size without losing their place on the page.
There is deliberately no `/maxsus-imkoniyatlar` page: these controls write to
`<html>` and localStorage, so they were always JavaScript-dependent and a
standalone page bought nothing a no-JS visitor could use.

Two independent switches are set as attributes on `<html>` and mirrored to
localStorage:

- `data-contrast="high"` — black/white/yellow palette at 21:1. It overrides
  **both** tones: in this mode the deep/light alternation is abandoned, because
  the goal is uniform legibility rather than brand expression. Note that
  `--muted-foreground` becomes full white — "muted" text must not stay dimmed
  for the users this mode exists for.
- `data-text-size="large" | "xlarge"` — scales the root font size. This only
  works for `rem`-based sizes: a `text-[13.5px]` silently opts an element out
  of the control entirely. **Never size text in `px`.** Where an exact optical
  size is needed, write the rem equivalent (`text-[0.84375rem]` === 13.5px at
  the default root) — the header's nav and utility strip both do this.

### Borders must use the semantic tokens, not raw gold

`--hairline` (structural dividers) and `--outline` (emphasis borders) exist
precisely so decorative gold rules survive accessibility mode:

| | deep | light | high contrast |
|---|---|---|---|
| `border-hairline` | gold @ 12% | gold-ink @ 18% | **white** |
| `border-outline` | gold @ 40% | gold-ink @ 45% | **yellow** |

Writing `border-gold/12` instead looks correct in the brand palette but is
invisible in high contrast — a 12%-alpha gold line on pure black is nothing,
and because the alpha is baked into the utility, overriding `--color-gold`
cannot rescue it. The tokens carry the alpha themselves so the high-contrast
block can swap in solid colours. The header's bottom edge, the Kirish button,
the language chips and the active-nav underline all went through this bug.

`AccessibilityScript` is a **blocking inline script in `<head>`**. It has to
be: applying the preference from an effect would flash the navy palette on
every navigation, for exactly the people who chose not to see it.

## Logo lockups

Two files, one component — always use `components/layout/logo.tsx`, never
reference the SVGs directly:

| File | Size | Used |
|---|---|---|
| `logo-dm-light.svg` | 313×69, 9.9 KB | full wordmark, from the given breakpoint up |
| `logo-short-light.svg` | 57×69, ~0.6 KB | mark only, below it |

`<Logo from="lg" priority />` in the header (the wordmark only fits once the
full nav appears at `lg`), `<Logo from="sm" />` in the footer.

It is a `<picture>` with a media-qualified `<source>`, not `next/image`, for
two reasons: the browser then fetches **only** the matching lockup — rendering
both and hiding one with CSS would still pull the 9.9 KB wordmark onto phones
that never show it — and `next/image` does not optimise SVG anyway without
`dangerouslyAllowSVG`, so it would add nothing. Widths are pinned per
breakpoint rather than `w-auto` because the two lockups have different aspect
ratios and `w-auto` would shift the header as the file arrives.

The favicon is the **short** mark: a 4.5:1 wordmark letterboxes into
illegibility at 16px.

## Number formatting

`src/lib/format.ts` groups thousands by hand instead of using
`Intl.NumberFormat`. Uzbek uses a space for grouping and a comma for decimals
("36 750 000", "86,4"), which several runtimes get wrong for `uz-UZ` — and
Intl output can differ between Node and the browser, which is a hydration
mismatch waiting to happen. Keep it deterministic.

## Still to do

- Remaining `davijara-v2.html` features: live auction countdowns and the
  Chart.js charts (line/doughnut/bar). Both need real data first — see below.
- Replace the placeholder pages with real content.

### Deliberately not ported

- **Testimonials.** The legacy markup carried five-star reviews attributed to
  named individuals ("Alisher Karimov, Tadbirkor, Toshkent"). They are
  fabricated marketing copy. Publishing invented citizen testimonials on a
  state portal is not acceptable; if real ones are wanted, they need actual
  attributable sources and consent.
- **Live auction cards.** The legacy countdowns ran off `data-end="7260"` —
  seconds from page load — so every "JONLI" auction restarted its timer on
  refresh. Fake live auctions could lead a citizen to believe they can bid on
  something that does not exist. Build this against real e-auksion.uz data,
  with server-provided ISO end timestamps so countdowns survive clock skew.
- **Chat FAB.** Inert UI with no backend behind it.
- Self-host photography and switch listing cards to `next/image`.
- A real geographic map at `/obyektlar/xarita`, from proper GeoJSON and an
  openly-licensed tile provider. **Do not approximate Uzbekistan's borders by
  hand**, and do not restore the legacy Google tile scraping.
