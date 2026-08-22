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

Two independent axes, and neither is a second palette — every value comes from
the one brand scale:

- **theme** — `data-theme` on `<html>`. Dark (unset) is the default and the
  brand; `"light"` is opt-in from the header toggle.
- **tone** — `data-tone` on each section, alternating down the page.

```tsx
<Section tone="deep">   {/* navy #07102b in dark, white in light */}
<Section tone="light">  {/* mist #eef1f8 in both */}
```

Both re-bind every semantic colour token for the whole subtree (see
`src/app/globals.css`). Descendants adapt with no props of their own —
*provided* they style with `bg-card`, `text-muted-foreground`,
`border-border` and friends.

Reaching for `bg-navy` or `text-gold` directly breaks the flip and will look
wrong in at least one of the four combinations.

**Gold is not a text colour on light surfaces.** `#c8a96e` on mist is 1.9:1 —
a hard WCAG AA failure. Use `--color-gold-ink` (`#7d6229`, 5.09:1) for
gold-toned text on light, or just `text-accent-foreground`, which already
resolves to the correct one per tone.

**Cobalt is the light theme's identity colour**, precisely because gold cannot
be. `--heading` takes `--color-cobalt` (#1a3a7c — 10.83:1 on white, 9.57:1 on
mist) and `@layer base` applies it to `h1`-`h5`, so headings carry the brand
while body copy stays navy.

**`--accent` is cobalt in the light theme, gold on navy.** It is what eyebrows,
icon tiles, action links, the active nav item and the active chips draw from —
around 90 elements on the homepage — so leaving it gold made the light theme
read as a gold site with blue titles. Same for `--hairline` and `--outline`,
which draw the section rules, the header edge and every card hover. Cobalt's
tint uses a lower alpha than gold's (0.12 / 0.14 / 0.38 against 0.18 / 0.18 /
0.45) because it is a far darker ink at the same opacity.

**Gold survives on a budget, and it is spelled `--ornament`.** Three places,
none of them clickable: the rotating word in the hero `<h1>`, the three hero
figures, and the Qidirish button (which keeps `--color-gold` as a background —
the page's one primary action is where a warm mass belongs). Never reach for
`--ornament` for anything a reader clicks; that is `--accent`'s job.

The measured ladder:

| | dark | light |
|---|---|---|
| eyebrow, hero figures | gold `#c8a96e` | gold-ink `#7d6229` |
| heading | white | **cobalt `#1a3a7c`** |
| body | white 85% | navy `#07102b` |
| small print | white 55% | navy-mid `#0d1e45` |

`--heading` must be redeclared in **every** block that redeclares
`--foreground`. It defaults to `var(--foreground)`, and a custom property
resolves where it is DECLARED and then inherits as a finished value — so a
lone `:root` declaration would freeze to white and light-tone sections would
render white headings on mist. High contrast reclaims it too: cobalt is 1.94:1
on black.

**The light theme has no pure white surface.** The ground is
`--color-mist-pale` (#f7f9fc) and the CARD is the white layer — the inverse of
the first version, where the page was white and the card was mist. White on
white is 1.06:1, so separation comes from depth instead:

```
mist-pale #f7f9fc   page ground
mist      #eef1f8   light-tone sections, the search band, the map backdrop
#ffffff             cards, inputs, popovers  + --shadow-1
```

**Depth is two tokens, `--shadow-1` (resting) and `--shadow-2` (hover), and
only two.** A ladder of five elevations is what makes a light theme look like
a pile of floating cards. They are tinted with navy-mid rather than black — a
neutral shadow over a blue-tinted ground reads as dirt. On the dark theme
level 1 is `none` (a card is already the lighter surface); high contrast sets
both to `none` (every boundary there is a solid line). Write them as the
arbitrary property `[box-shadow:var(--shadow-1)]`, never `shadow-[…]` —
Tailwind's shadow utility recolours a value it cannot inspect to transparent.

**`dark:` is rebound to `data-theme`** by an `@custom-variant` at the top of
`globals.css`. Tailwind's default keys it to `prefers-color-scheme`, and
shadcn's `ui/` output uses it 22 times — so a visitor with a dark OS saw
dark-variant inputs while the site was in its light theme. Rebinding beats
editing `ui/`, which stays untouched CLI output.

**Interaction states must survive greyscale.** Card hover is a shadow step
plus a 4px lift, the active chip is a filled background plus weight, an
unavailable calendar day is weight + opacity + a dot. Nothing anywhere depends
on hue alone — in high contrast every ink is white, and in the light theme
`--foreground` and `--muted-foreground` are two points apart.

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
- `muddat` — a day window, `?muddat=0-1`, `1-3`, `3-5`, in the same `lo-hi`
  grammar as `maydon` and `narx`. This is the chips on "Yaqinlashayotgan
  savdolar": 1 kun, 3 kun, 5 kun, Hammasi. The three windows are **disjoint
  and adjacent** — exclusive lower bound, inclusive upper — so a lot falls in
  at most one; nested windows ("within 1 / 3 / 5") were the first shape and
  could not answer "what is NOT imminent". They cover the first five days
  only, and Hammasi (no parameter) is everything, so its count is larger than
  the three combined rather than equal to them. Bounds are rolling hours, not
  calendar days, so they agree with the countdown printed on the card.

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
- **Statistics** — all four hero cards are now LIVE and all four follow
  `?hudud=` and `?tuman=`. Open lots and lots sold this year
  (`sold_price > 0`) come from the listings feed; signed contracts and leased
  area come from `RENT_CONTRACTS_API_URL`, a second service whose `region` is
  optional (omit it for the republic). Each degrades on its own: the first two
  fall back to the verified static figures, and the sold card is dropped rather
  than shown empty because nobody has published that number.
  **Do not derive a leased-AREA figure from the listings feed's `rent_area`.**
  Summed over 2026 it gives 161 mln m², with one region alone contributing 150
  mln from 266 lots (~564 000 m² each) — the field is not comparable across lot
  types. The register's `total_rental_area` is the figure to use; it reports
  148,8 mln m² nationally against the operator's static 145,9.

- **District figures across the two services.** The register identifies
  districts by a code (1718203) and a Cyrillic abbreviation ("Оқдарё т."); the
  listings feed sends a Latin name and no code ("Oqdaryo tumani"). Until the
  operator adds a district code to the listings feed, `rent-contracts.ts`
  bridges them by name: transliterate, match exactly, then within two edits
  when exactly one candidate is that close, and refuse anything ambiguous.
  Measured over all fourteen regions — 196 districts carrying lots — 183 match
  exactly, 13 near, none by guesswork. An unmatched district widens to the
  region and the hero says so.
- **The order endpoint returns PERSONAL DATA.** `winner_name`,
  `winner_passport`, `winner_pinfl`, `winner_phone` and `winner_address` come
  back for every concluded lot. None of it is on any type in `types/content.ts`
  and none of it may reach a page. The sale is public; the buyer is not.
  `lib/data/lot-images.ts` reads only `images[]` from that response, and
  `SoldLot` carries only prices, area and place.

- **No bid count exists.** Neither service reports how many raises a lot took —
  there is no bid history, participant count or step field anywhere in either
  response. The sold-lot card shows the rise from the start price instead,
  which is arithmetic on two published figures. The raises DO land on a
  10%-of-start grid in 906 of 997 sales, so a step count could be
  reverse-engineered; 91 sales do not fit it, so it is not printed.

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
