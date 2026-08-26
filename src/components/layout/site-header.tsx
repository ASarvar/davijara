import { Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { contacts, site } from "@/content/site";
import { Container } from "./section";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { MobileNav } from "./mobile-nav";
import { AccessibilityDialog } from "./accessibility-dialog";
import { SocialLinks } from "./social-links";
import { ThemeToggle } from "./theme-toggle";

/**
 * Site header — a tall brand band above a centred navigation bar.
 *
 *     ┌─ LOGO ──────────────── a11y · theme ─┐  brand band, --band
 *     │                  phone · email       │
 *     │                  telegram ig fb      │
 *     ├──────────────────────────────────────┤
 *     └──── Markaz · Faoliyat · Hujjatlar ───┘  nav bar, --band, STICKY
 *
 * THE TWO BANDS: brand band on `--band`, nav bar on `--background`. The
 * tinted step is the one carrying the contact details and the logo, and the
 * bar the reader actually navigates from sits on the page's own ground — so
 * the persistent rail reads as continuous with the content beneath it rather
 * than as a second tinted slab stacked on the first.
 *
 * THE WHOLE HEADER STICKS, both bands together.
 *
 * An earlier version pinned only the nav bar and let the brand band scroll
 * away, on the grounds that ~166px of permanent chrome was too much of an
 * 800px viewport. That reasoning was sound for the header it was written
 * against and no longer applies to this one: trimming the band's padding from
 * `py-6` to `py-1` took it from 124px to 76px, so both bands together now
 * hold 125px — less than the nav bar plus the old band, and the logo stays a
 * way home from anywhere on the page.
 *
 * One `sticky` on the <header> rather than one per band, which also removes
 * the breakpoint dance the split needed: below `xl` the nav bar renders
 * nothing at all (the sheet takes over), so a bar-only sticky had to hand the
 * job back to the header at exactly that width.
 *
 * THE BANNER IS NOT HERE. It belongs to the homepage only (see
 * `components/sections/banner.tsx`), so it must not be part of the chrome
 * every route renders.
 */
export async function SiteHeader() {
  const tTopbar = await getTranslations("topbar");
  const tCommon = await getTranslations("common");

  return (
    <header data-tone="deep" className="sticky top-0 z-40">
      {/* ── Brand band ─────────────────────────────────────────────────── */}
      <div className="bg-band">
        {/* The band's height is set by the three-row contact stack, not by
            this padding, so the padding is only what keeps that stack off the
            band's edges. It went py-6 → py-1 while the header was being cut
            down, which left the rows touching the boundary; py-2/3 is the
            breathing room put back. */}
        <Container className="relative flex items-center justify-between gap-4 py-2 xl:py-3">
          <Link
            href="/"
            className="flex shrink-0 items-center"
            aria-label={site.name}
          >
            <Logo variant="header" priority />
          </Link>

          {/* Not a decorative chip — this deploy is a real test rollout of a
              government portal, and CLAUDE.md's accuracy-first rule extends
              to not letting it read as final. Styled as an official tag
              (accent + status dot), the same visual language as the active
              nav item below, rather than an alarm-red error badge — a state
              portal disclosing its own status is routine, not a fault
              condition.

              Centred by absolute positioning rather than as a real flex
              child: with `justify-between` already spreading the logo and the
              contact stack to the two edges, a middle flex item would land
              wherever their widths happen to leave off, not at the true
              centre. Hidden below `sm`, where centring it on a 375px row
              would sit it on top of the logo. */}
          <div className="pointer-events-none absolute inset-0 hidden items-center justify-center sm:flex">
            {/* pointer-events restored here, on the badge alone — the wrapper
                above spans the full band so it can centre this, but must stay
                click-through or it would sit on top of the logo and the
                controls and swallow their clicks. */}
            <span
              title={tTopbar("testModeDescription")}
              className="border-outline bg-accent text-accent-foreground pointer-events-auto flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium"
            >
              <span
                aria-hidden="true"
                className="bg-accent-foreground size-1.5 shrink-0 rounded-full"
              />

              {/*
                Per-letter shimmer. The letters are split for the animation
                ONLY, so they are hidden from assistive tech and the real
                label is carried by the sr-only span below — a screen reader
                must hear the sentence, not a string of separate letters.

                The letters live in their own wrapper rather than as direct
                children of the badge: the badge is `gap-1.5`, which would
                otherwise open a 6px gap between every character.
              */}
              <span aria-hidden="true" className="test-mode-text">
                {(() => {
                  const chars = Array.from(tTopbar("testMode"));
                  return chars.map((char, i) =>
                    char === " " ? (
                      <span key={i}>&nbsp;</span>
                    ) : (
                      <span
                        key={i}
                        className="test-mode-letter"
                        /*
                          A 0–1 position through the label, not a raw index.
                          CSS multiplies it by one fixed sweep duration, so the
                          wave takes the same time to cross however long the
                          label is.
                        */
                        style={
                          { "--pos": i / chars.length } as React.CSSProperties
                        }
                      >
                        {char}
                      </span>
                    ),
                  );
                })()}
              </span>
              <span className="sr-only">{tTopbar("testMode")}</span>
            </span>
          </div>

          {/*
            THE CONTACT STACK, right-aligned, three rows.

              1  theme + accessibility controls
              2  phone and email, side by side
              3  the social marks

            Phone and email share row 2 because they answer one question —
            "how do I reach the Centre" — and stacking them made the band a
            row taller to say it twice.

            `text-sm` (15px on this project's scale) rather than the 12.5px it
            ran at. That figure came from the old single-line utility strip,
            where every pixel of height was spent on the sticky header; in a
            column with room around it, 12.5px was simply small — and it is
            the phone number a citizen is squinting at.
          */}
          <div className="text-muted-foreground hidden flex-col items-end gap-2 text-sm xl:flex">
            <div className="flex items-center gap-4">
              {/* Theme first, then the accessibility dialog: this one is a
                  single-tap switch, the other opens a panel, and the lighter
                  control reads better closest to the content it changes. */}
              <ThemeToggle />
              <AccessibilityDialog />
            </div>

            {/*
              PHONE ONLY. The email was removed from this band — it lives on
              /aloqa now, alongside the address, the hours and the map, which
              is where a reader looking for a way to write to the Centre goes.

              Deleted rather than commented out, which is this project's own
              rule: a commented-out block is invisible to the type checker and
              leaves its import tripping the linter (see the note on the three
              unused sections in CLAUDE.md). Re-adding it is four lines and a
              `Mail` import.
            */}
            <a
              href={contacts.phoneHref}
              className="hover:text-accent-foreground flex items-center gap-1.5 transition-colors"
            >
              <Phone aria-hidden="true" className="size-3.5 shrink-0" />
              {contacts.phone}
            </a>

            <SocialLinks className="flex items-center gap-3" />
          </div>

          {/*
            Below `xl` the same controls collapse onto the logo's own row and
            the sheet trigger joins them — the brand band IS the whole header
            at that width, so everything the reader can act on has to be in
            it.
          */}
          <div className="flex shrink-0 items-center gap-3 xl:hidden">
            <ThemeToggle />
            <AccessibilityDialog />
            <MobileNav />
          </div>
        </Container>
      </div>

      {/* ── Navigation bar ─────────────────────────────────────────────── */}
      {/*
        BACK INSIDE `<header>`, and the history is worth keeping because both
        arrangements were correct for the design they were written against.

        While only the bar was meant to stick, it had to be a SIBLING of the
        header: `position: sticky` travels only within its own parent's box,
        and nested under a header that ended exactly where the bar did there
        was zero room to travel — it scrolled away with the brand band and the
        sticky did nothing (measured: at scrollY 900 its top sat at -581px).

        Now the whole header pins, so the sticky is on the PARENT and both
        bands ride with it. A sticky child inside a sticky parent would be the
        broken case again; one sticky ancestor containing both is not.

        `hidden xl:block`, so this bar does not exist at all below the
        breakpoint — the sheet trigger in the band above is the navigation
        there.

        `border-y` on the bar rather than a bottom border on the band above:
        the bar is the header's bottom edge, so it carries it.
      */}
      <nav
        aria-label={tCommon("mainMenu")}
        className="bg-background border-hairline hidden border-y xl:block"
      >
        {/* CENTRED, matching the operator's reference layout. The six section
            labels are short enough in Uzbek to sit as one centred group;
            `flex-wrap` in NavLinks still lets the row break onto a second line
            at 125/150% text rather than running off the edge. */}
        <Container className="flex justify-center">
          <NavLinks />
        </Container>
      </nav>
    </header>
  );
}
