# Layout chrome

Header, footer, logo and the `Section`/`Container` primitives. Loaded only
when working in this directory — the always-loaded rules live in the root
`CLAUDE.md`, including the one that matters most from outside here: **always
use `logo.tsx`, never reference the logo SVGs directly.**

## Header

`site-header.tsx` is one component, not a topbar stacked on a navbar.
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

## Logo lockups

Two files, one component:

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
