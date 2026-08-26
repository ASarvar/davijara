---
name: davijara-ui
description: How to build a page or component on davijara.uz — what a considered design looks like here, the Server-Component-by-default rule and which components may be client, why filter and search state lives in the URL, and the full motion vocabulary (data-reveal, data-split, data-clip, data-draw, data-parallax, data-enter). Load BEFORE creating a page or section, adding "use client", building a filter, or animating anything.
---

## Designing a new page or component

**Every new page ships with a considered visual design and motion. A stack of
identical bordered cards with text in them is not a design** — it is what you
get when the step is skipped, and it is the one review note that has come back
more than once. Before writing markup, decide what this particular page *is*:
a chart, a register, a timeline, a comparison, a form. Then build that shape.

Work from what already exists, in this order:

1. **Reach for the primitives** in `src/components/common/` — `SurfaceCard`,
   `IconTile`, `StatList`, `Eyebrow`, `ActionLink`. New shapes join them there
   rather than being written inline in a page.
2. **Give the page a spine.** Numbered levels, a drawn rail, a grid with a
   deliberate rhythm, a lead element that is genuinely larger than the rest —
   something that says how the content is organised before a word is read.
   `/markaz/tuzilma` and `/yangiliklar` are the current references.
3. **Lead with figures where the data has any.** Counts, sums and dates that
   are DERIVED from the data layer, never typed into markup.
4. **Use icons and tiles to give long Uzbek names a shape.** Register the icon
   in `components/icon.tsx`; content refers to it by name.
5. **Every interactive surface needs a hover state and an entrance.** See the
   motion vocabulary below.

Depth is `--shadow-1` / `--shadow-2` and nothing else; colour comes from the
semantic tokens, never the raw brand scale. Check the result in all four
combinations (dark/light theme × deep/light tone) plus high contrast before
calling it done — the light theme's `deep` tone is a PALE surface, and code
that assumes `deep` means navy has shipped a black-on-black section here
before.

## Server Components by default

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

## Motion

**GSAP + ScrollTrigger + SplitText, driven from one client island** —
`components/motion/motion-provider.tsx` — with Lenis for smooth scrolling.
Sections stay Server Components: the provider reads plain attributes off the
markup the server already rendered, so nothing animated has to cross the
server/client boundary. `motion/react` is used in exactly one place
(`animated-stat-value`), where a value has to be interpolated rather than an
element transformed.

The vocabulary, all of it attribute-driven:

| Attribute | Effect |
|---|---|
| `data-reveal="up\|down\|left\|right\|fade\|scale"` | arrives once on entry, batched into a cascade with its neighbours |
| `data-split` | heading revealed line by line out of a mask |
| `data-clip` | wipes up from its own bottom edge |
| `data-draw` | scrubs a `--p` custom property 0→1 against scroll |
| `data-parallax="0.12"` | drifts against the scroll |
| `data-enter` + `--enter-delay` | time-based entrance for above-the-fold content |

Direction carries meaning and is chosen per section, not varied at random:
`up` for card grids, `left` for list rows and ordered steps, `down` for things
that belong to what is above them, `scale` for logos and marks, `fade` for
blocks whose children do the moving.

**Rules that are load-bearing, not stylistic:**

1. **A hidden start state may only be applied under `.motion-armed`.** That
   class is added by the inline script in `motion-arm-script.tsx` and is the
   guarantee that content which starts hidden is content something is going to
   reveal. Four independent guards each end with the content simply visible:
   no JavaScript, `prefers-reduced-motion: reduce`, GSAP failing to
   initialise (a deadman timer strips the class), and the `[data-revealed]`
   stamp the provider writes when it is finished with an element. Never write
   a static `opacity: 0` outside that class — on a public-service portal,
   content nobody can read is worse than content that does not move.
2. **A scrubbed value defaults to its FINISHED state.** `--p` is `1` unless
   `.motion-armed` sets it to `0` (see `.step-rail-fill`, `.org-rail-fill`).
   A progress rail that fails to initialise must be drawn, not missing.
3. **`data-enter` animates transform only, never opacity.** Its document
   timeline is active but frozen at 0 in a background tab, and a frozen active
   timeline still applies the `from` keyframe. Fading here would hide the hero
   headline from anyone opening the page in a background tab, and from
   search-engine and print renderers.
4. **Nothing may depend on hue alone.** A hover is a lift plus a shadow step;
   an active chip is a fill plus weight. In high contrast every ink is white,
   and decorative blurred layers are stripped — so a state carried only by
   colour or glow disappears for exactly the readers who need it most.

The word-rotator's delays are negative for the same reason as rule 3 — see the
comment in `globals.css`.
