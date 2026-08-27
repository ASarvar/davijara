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

## Boshqaruv paneli (`/admin`)

Editors write news and pages here instead of through a git commit. It sits
**outside `[locale]`** — its own root layout, no locale prefix, Uzbek-only
chrome, and `admin` is excluded from the proxy matcher so it is not
locale-redirected. The content it edits is still trilingual.

| Where | What |
|---|---|
| `src/lib/db/` | SQLite (better-sqlite3, pinned `^12`), append-only migrations |
| `src/lib/auth/` | scrypt passwords, DB-backed sessions, rate limit, audit log |
| `src/lib/media/` | uploads: byte-sniffed type, content-addressed, served by a route |
| `src/lib/data/page-routes.ts` | which of the site's own routes an editor can fill in |
| `src/lib/data/navigation.ts` | the menu: `mainNav` in code, plus pages the panel placed |
| `src/types/blocks.ts` | the block model editors compose content out of |
| `src/app/admin/` | `(panel)` route group = signed-in; `login` / `setup` outside it |
| `scripts/admin-user.mjs` | break-glass CLI for a locked-out administrator |

Seven rules that are load-bearing, each written against a failure that
already happened or would be silent:

1. **`getDb()` is called inside the function that queries — never hoisted to
   module scope.** `next build` collects page data in 23 worker processes; an
   eager module-level connection made all 23 race to run the migrations and
   the build died with `SQLITE_BUSY`.
2. **Every page *and every Server Action* calls its own guard.** A layout
   check only protects rendering; a Server Action is a POST endpoint that can
   be reached without the layout ever running. `requireUser()` redirects,
   `requireUserForAction()` throws — an action must not redirect, because a
   redirect reads as success to the client.
3. **The database and uploads live in `DATA_DIR` (`shared/`), never in the
   release tree.** `deploy.sh` keeps five releases; anything written inside
   one is deleted five deploys later, silently. The systemd unit needs a
   matching `ReadWritePaths` or `ProtectSystem=strict` makes it read-only.
4. **The session cookie is scoped to `basePath`, not `/`.** `davijara.uz/`
   belongs to other projects on the same server — a `/` cookie would send
   admin session tokens to all of them.
5. **The build never opens the database.** `getDb()` returns an in-memory
   handle during `phase-production-build`, so prerendered routes get empty
   results instead of the build creating root-owned files the service cannot
   write. Verified by building with a throwaway `DATA_DIR` and checking that
   nothing was written to it.
6. **Every menu is editable — the operator reversed this rule from the panel
   build.** `mainNav` in `src/content/site.ts` still exists, but only as the
   seed migration 8 copied into `menu_sections` and the fallback
   `getNavigation()` returns if the database can't be read. The five
   institutional sections (Markaz, Faoliyat, Hujjatlar, Ochiq maʼlumotlar,
   Yangiliklar) can be renamed, reordered or deleted from `/admin/menyu`
   exactly like a section an operator created — see the note at the top of
   `lib/data/navigation.ts` for how a renamed row keeps its 26 hard-coded
   site routes (matched by `key`, not by label) and what deleting one
   actually does to them. Only `home` and `contact` stay literal, plain
   links with no dropdown. A menu with no page under it is skipped rather
   than rendered, so an empty one is never a dead entry. Because the header
   sits in the root layout, a placement or menu change revalidates `/` as a
   layout, and `[locale]/layout.tsx` carries a 300 s window so a fresh
   deploy's build-time menus cannot stay wrong.
7. **Editor content is plain text; nothing renders editor HTML.** Blocks
   store strings, `BlockContent` renders them as React children, and there is
   no `dangerouslySetInnerHTML` anywhere in that path. That is what makes
   editor-supplied content safe without a sanitiser — do not add one, add a
   structured field instead. Uploads follow the same principle: the type comes
   from the file's bytes, never its name or `Content-Type`, and SVG is
   refused because it is a document that can carry script.

Statutory content is being moved here at the operator's request, which is what
the audit log's full before/after snapshots are for: they replace the reviewed
git diff that used to be the only way that text could change. Until that
migration lands, non-negotiable 1 above still applies as written.

## Still to do

- **Admin panel: complete.** News, images, pages, users, the audit log, the
  24 privileges and both Markaz documents are editable. `content/structure.ts`
  is the one deliberate exception.
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
