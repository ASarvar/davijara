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

## Session hygiene

This project runs in long single sessions, and the context window is the
budget that runs out first. Standing instructions, so they do not have to be
repeated:

- **Compact at the seams, not on a timer.** `/compact` costs a full read of
  the conversation, so run it when a phase ENDS — a page shipped, a bug closed,
  a switch from one section of the site to another — rather than every few
  messages. Compacting mid-task throws away the detail the task still needs.
- **When compacting, keep**: the file paths touched and why, decisions that
  are not visible in the code (rejected options and the reason), measured
  numbers (contrast ratios, lot counts, API field names), and anything still
  unverified or awaiting the operator. **Drop**: tool output already acted on,
  superseded drafts, and narration.
- **Delegate wide reads.** A sweep over many files, a log or migration to
  audit, a large document to summarise — hand it to a subagent, which burns
  its own window and returns a summary. Do this only when asked, or when the
  read is genuinely broad; a two-file lookup is cheaper done directly.
- **Read narrowly.** `sed -n` a range, `grep` with context, `Read` with an
  offset. Whole-file reads of `globals.css` (1 800 lines) or
  `lib/data/listings.ts` (1 400) are almost never what the question needs.
- **Ask a narrow question.** "Fix the 8-step inventory logic in
  `worker/inventory.ts`" reads two files; "improve the code" reads the repo.

## Deep guidance lives in skills, not here

This file is the always-loaded brief and is kept SHORT on purpose. The
long-form rules — with the measurements and the bugs that produced them — sit
in `.claude/skills/`, which load only when the work needs them:

| Skill | Load before |
|---|---|
| `davijara-theming` | any colour, contrast, border, shadow, `globals.css`, or accessibility mode |
| `davijara-ui` | building a page or section, `"use client"`, filters, or motion |
| `davijara-data` | `lib/data/*`, hero statistics, or anything reading an upstream API |
| `davijara-admin` | `/admin`, `src/lib/{db,auth,media}/`, admin data modules, or panel migrations |

The rules below are binding on their own; the skills explain WHY and carry the
numbers. If a change touches one of those areas, load the skill first — the
reasoning there is the record of what already went wrong once.

## Non-negotiables

**1. Statutory content is verbatim — and most of it now lives in the
database.** The 24 rent privileges (PQ-239, PF-93, VM-626 …) and the two
Markaz documents (`about`, `duties`) were moved out of `src/content/` by
migrations 5 and 6 at the operator's request. Those modules stay on disk as
the seeds' source AND as the runtime fallback — `getAbout()` renders them if
the row is missing or fails validation, so a bad restore shows the last
known-good text rather than an empty page. **`src/content/structure.ts` is
deliberately still code**: the operator asked for the org chart to stay out
of the panel.

The rule itself has not changed: never reword, reformat, summarise, "improve"
or machine-translate any field — `legalBasis` above all, and the function
groups' a/b/v/g/d/e/j lettering is the statute's own and must never be
renumbered into a Latin sequence. What changed is the safeguard: a reviewed
git diff used to be the only way this text could move, and now the **audit
log's complete before/after snapshots** are, so nothing may write to
`privileges` or `documents` without going through `audit()`. `messages/ru.json`
and `en.json`: UI chrome may be translated, legal text may not — which is why
none of this content has a translations table.

**2. Components consume semantic tokens, never raw brand colours.** Two
independent axes — `data-theme` on `<html>`, `data-tone` on each section —
re-bind every colour token for a subtree. Style with `bg-card`,
`text-muted-foreground`, `border-border`, `border-hairline`, `border-outline`,
`--accent`, `--ornament`; reaching for `bg-navy` or `text-gold` breaks at
least one of the four combinations. Gold is not a text colour on light
surfaces (1.9:1). Depth is `--shadow-1` / `--shadow-2` and nothing else.
**A block that redeclares one half of a contrast pair owes an answer for the
other half in every theme** — see `davijara-theming`, which is where the
measured ladder, the `--heading` trap and the black-on-black bug are recorded.

**3. Server Components by default.** The homepage ships no page-level
JavaScript. `"use client"` only when the browser is genuinely needed; the
current list is in `davijara-ui`. Filter and search state belongs in the
**URL**, not React state — that is what makes a view linkable, back-button
correct, crawlable and free of JavaScript.

**4. Content flows through the data layer.** Components must not import from
`src/content/` directly; read through `src/lib/data/` (`getPrivileges()`,
`getListings()`, `getOrgStructure()` …). Those functions are `async` even
though they read local modules today, so a real API can replace their bodies
without touching a component. Derived values stay derived — counts and totals
are computed from the data, never typed into markup.

**5. `legacy/` is read-only.** It holds the original static site, kept as
reference for porting decisions and cited throughout this codebase's comments.
Read it, cite it, never edit it.

**6. Never invent facts.** This is a government portal: no invented figures,
addresses, legal references, testimonials or news items. If a value cannot be
verified, leave it out and say so. Upstream quirks and the figures that must
NOT be derived are in `davijara-data`.

## Shared primitives

`src/components/common/` holds the deduplicated card, tile and link building
blocks — reach for those before writing a new one. The full catalogue, the
native `<select>` trap and the placeholder-SVG rule live in the `davijara-ui`
skill. `ui/` is shadcn CLI output: do not hand-edit it, and do not put project
primitives there.

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

## Maps

Both Leaflet maps — the listings map (the `xarita` tab on `/ijaraga-obyektlar`)
and the office map on `/aloqa` — are built, clustered, and draw real
coordinates. The basemap is OpenStreetMap's own tile server, and
`src/lib/map-tiles.ts` carries the full record of which providers were ruled
out and why: read that comment before changing the tile source, and get any
new URL template from the provider's own docs rather than guessing it.

**Do not approximate Uzbekistan's borders by hand**, and do not restore the
legacy Google tile scraping.

## Boshqaruv paneli (`/admin`)

Editors write news and pages here instead of through a git commit. It sits
**outside `[locale]`** — its own root layout, no locale prefix, Uzbek-only
chrome, and `admin` is excluded from the proxy matcher so it is not
locale-redirected. The content it edits is still trilingual.

Everything else — where the pieces live (`src/lib/{db,auth,media}/`,
`navigation.ts`, `blocks.ts`) and the seven load-bearing rules (`getDb()`
scoping, per-action guards, `DATA_DIR`, the admin cookie path, the build never
opening the DB, editable menus, plain-text editor content) — is in the
**`davijara-admin` skill**. Load it before touching `src/app/admin/`,
`src/lib/{db,auth,media}/`, the admin data modules, or panel migrations.

Statutory content is being moved into the panel at the operator's request,
which is what the audit log's full before/after snapshots are for. Until that
migration lands, non-negotiable 1 above still applies as written.

## Still to do

- **Admin panel: complete.** News, images, pages, users, the audit log, the
  24 privileges and both Markaz documents are editable. `content/structure.ts`
  is the one deliberate exception.
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
