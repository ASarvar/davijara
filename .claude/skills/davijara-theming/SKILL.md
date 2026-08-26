---
name: davijara-theming
description: Colour tokens, the two theme axes (data-theme x data-tone), the light palette, shadows, borders and accessibility mode for davijara.uz. Load BEFORE touching any colour, contrast, border, shadow, globals.css, or anything under data-contrast / data-text-size.
---

# Theming — tokens, tones and accessibility mode

## Components consume semantic tokens, never raw brand colours

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
