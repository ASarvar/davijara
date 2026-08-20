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

Read `package.json` for versions. Two Next.js 16 renames trip up training
data:

- Middleware is now **Proxy** — the file is `src/proxy.ts`, not `middleware.ts`.
- `params` and `searchParams` are **async** and must be awaited.

Read `node_modules/next/dist/docs/` before writing Next-specific code.

## Commands

`package.json` has the usual scripts. The one that isn't guessable:

```bash
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
`/obyektlar`, so results stay addressable as
`?hudud=&tuman=&maydon=&narx=&savdo=` and a search can be linked and indexed.
`FILTER_KEYS` in `lib/data/listings.ts` is the single list of those keys —
every link that has to survive a filter (the pager, "Barcha obyektlar", the
auction chips) builds its query from it, because hand-listing them in three
places is what once dropped `tuman` from every page link.

The panel's dropdowns are shadcn's `Select` (Radix, client JS), not native
`<select>` elements — a deliberate trade of the former zero-JS approach so the
open dropdown panel can carry the site's rounded/gold-bordered styling, which
Chromium won't apply to a native `<select>` popup. Radix's hidden bubble
`<select>` still submits `name=value` on the form, so GET submission needs no
`onSubmit` handler of our own.

**Auction time is two separate parameters**, because they answer two questions
and neither generalises to the other:

- `savdo` — one exact day, `?savdo=2026-08-27`. This is the catalogue's
  "Savdo kuni" field, modelled on e-auksion's filter of the same name so a
  citizen meets the control they already know. ISO in the URL (it sorts, and
  it is unambiguous about day-vs-month); displayed as 27.08.2026. Matched as a
  **Tashkent** calendar day — an auction at 10:00 local is 05:00Z, so a UTC
  comparison would file every morning lot under the previous day.
- `muddat` — a day window, `?muddat=0-3`, `3-5`, `5-`, in the same `lo-hi`
  grammar as `maydon` and `narx`. This is the chips on "Yaqinlashayotgan
  savdolar". The three are **disjoint** — exclusive lower bound, inclusive
  upper — so a lot falls in exactly one and the counts sum to the catalogue;
  nested windows ("within 1 / 3 / 5") were the first shape and could not
  answer "what is further out". Bounds are rolling hours, not calendar days,
  so they agree with the countdown printed on the card.

`savdo` is in `FILTER_KEYS`; `muddat` is deliberately not. It belongs to the
homepage strip, which reads it directly — carrying it into the pager would put
a parameter in every catalogue URL that nothing on that page can see or change.
The two places that own it are the chips and the panel's hidden input, which
exists so pressing Qidirish on the homepage does not silently clear a window
the reader just chose.

`SearchWidget` renders the calendar **only** when passed `auctionDay` —
/obyektlar does, the homepage does not; that panel stays the four fields it has
always been. The calendar is the one client component in the panel (a popover
with a month cursor is the act of choosing, not the filter itself), and it
greys out every day with no lots, from `getAuctionDays()` scoped to the rest of
the active search. e-auksion lets you pick any square and most return nothing.

Both variants share **one grid, four field columns wide**, so "Savdo kuni"
wraps under Hudud at exactly the width of the fields above it and columns 2-4
of that row stay free for the filters that come next. Five fields in one row
does not fit at any viewport width — the container caps at 1200px, which
leaves 144px of text box for "Qoraqalpog'iston Respublikasi" and clips it
mid-word.

### 4. Content flows through the data layer

Components must not import from `src/content/` directly. Read through
`src/lib/data/` (`getPrivileges()`, `getListings()`, `getRegions()` …). Those
functions are `async` even though they currently read local modules, so a real
API can replace their bodies without touching a single component.

Derived values stay derived: privilege category counts are computed from the
data, never typed into markup.

### 5. `legacy/` is read-only

`legacy/` holds the original static site — `index.html`, `imtiyozlar.html`,
`davijara-v2.html`, `styles.css` — kept as reference for porting decisions and
cited throughout this codebase's comments. Read it, cite it, never edit it.

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

## Logo

Always use `components/layout/logo.tsx` — never reference the logo SVGs
directly. Sizes, the `<picture>` rationale and the favicon note are in
`src/components/layout/CLAUDE.md`.

## Number formatting

`src/lib/format.ts` groups thousands by hand instead of using
`Intl.NumberFormat`. Uzbek uses a space for grouping and a comma for decimals
("36 750 000", "86,4"), which several runtimes get wrong for `uz-UZ` — and
Intl output can differ between Node and the browser, which is a hydration
mismatch waiting to happen. Keep it deterministic.

## Still to do

- Remaining `davijara-v2.html` features: the Chart.js charts
  (line/doughnut/bar). Needs real data first — see below.
- Replace the placeholder pages with real content.
- **Three built sections are not on the homepage**: `services` (light),
  `impact` (deep), `partners` (deep). They render correctly and are left out
  of `app/[locale]/page.tsx` entirely rather than commented in place. Adding
  one back means re-assigning every tone after its insertion point — see the
  rhythm comment in that file.

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
