import { Mail, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { contacts, site } from "@/content/site";
import { Container } from "./section";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { MobileNav } from "./mobile-nav";
import { AccessibilityDialog } from "./accessibility-dialog";
import { ThemeToggle } from "./theme-toggle";

/**
 * Site header — a tall brand band above a centred navigation bar.
 *
 *     ┌─ LOGO ──────────────── a11y · theme ─┐  brand band, --background
 *     │                        phone         │
 *     │                        email         │
 *     ├──────────────────────────────────────┤
 *     └──── Markaz · Faoliyat · Hujjatlar ───┘  nav bar, --band, STICKY
 *
 * THE TWO BANDS: brand band on `--band`, nav bar on `--background`. The
 * tinted step is the one carrying the contact details and the logo, and the
 * bar the reader actually navigates from sits on the page's own ground — so
 * the persistent rail reads as continuous with the content beneath it rather
 * than as a second tinted slab stacked on the first.
 *
 * WHY ONLY THE NAV BAR STICKS
 *
 * The brand band is ~110px at `xl` and the contact stack inside it is three
 * lines. Sticking the whole header would hold ~166px — a fifth of an 800px
 * viewport — on every page, to keep showing a phone number the reader has
 * already seen. So the band scrolls away and the nav bar alone pins to the
 * top, which is the only part with a job to do while reading.
 *
 * Below `xl` that inverts: the nav bar renders nothing (the sheet takes over)
 * so there would be nothing left to stick, and the header itself becomes the
 * sticky element instead — at that width it is one compact row of logo +
 * controls, ~64px, which is affordable. Hence `sticky xl:static` on the
 * header against `xl:sticky` on the bar.
 *
 * THE BANNER IS NOT HERE. It belongs to the homepage only (see
 * `components/sections/banner.tsx`), so it must not be part of the chrome
 * every route renders.
 */
export async function SiteHeader() {
  const tTopbar = await getTranslations("topbar");

  return (
    <>
      {/* ── Brand band ─────────────────────────────────────────────────── */}
      <header data-tone="deep" className="bg-band sticky top-0 z-40 xl:static">
        <Container className="relative flex items-center justify-between gap-4 py-3 xl:py-6">
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
            THE CONTACT STACK, right-aligned and three rows deep.

            Controls on top, then phone, then email — the order the operator's
            reference layout uses. It is a column rather than the old single
            strip because the brand band is now tall enough to carry one, and
            because a phone number the reader has to scan a wide row for is a
            phone number they do not find.

            0.78125rem === 12.5px at the default root size: the same rendering
            as a `text-[12.5px]`, but rem-based, so it scales with the "Matn
            o'lchami" accessibility setting instead of ignoring it.
          */}
          <div className="text-muted-foreground hidden flex-col items-end gap-2 text-[0.78125rem] xl:flex">
            <div className="flex items-center gap-4">
              {/* Theme first, then the accessibility dialog: this one is a
                  single-tap switch, the other opens a panel, and the lighter
                  control reads better closest to the content it changes. */}
              <ThemeToggle />
              <AccessibilityDialog />
            </div>

            <a
              href={contacts.phoneHref}
              className="hover:text-accent-foreground flex items-center gap-1.5 transition-colors"
            >
              <Phone aria-hidden="true" className="size-3.5 shrink-0" />
              {contacts.phone}
            </a>

            <a
              href={contacts.emailHref}
              className="hover:text-accent-foreground flex items-center gap-1.5 transition-colors"
            >
              <Mail aria-hidden="true" className="size-3.5 shrink-0" />
              {contacts.email}
            </a>
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
      </header>

      {/* ── Navigation bar ─────────────────────────────────────────────── */}
      {/*
        A SIBLING OF THE HEADER, not a child of it, and that is what makes the
        sticky work rather than a styling preference.

        `position: sticky` travels only within its own parent's box. Nested
        inside `<header>`, this bar's parent ended exactly where the bar did —
        zero room to travel — so it scrolled away with the brand band and the
        sticky did nothing at all. Measured: at scrollY 900 its top was at
        -581px. Lifted to a body-level sibling, its containing block is the
        page and it pins for the whole document.

        The alternative — keeping it nested and giving `<header>` a negative
        `top` equal to the brand band's height — would hardcode a pixel value
        that the "Matn o'lchami" control changes at runtime, so the bar would
        detach from the top edge for exactly the readers who enlarged the
        text.

        `hidden xl:block`, so this bar does not exist at all below the
        breakpoint — the sheet trigger in the band above is the navigation
        there, and the header itself carries the sticky at that width.

        `border-y` on the bar rather than a bottom border on the band above:
        the bar is what survives scrolling, so it carries its own edges.
      */}
      <nav
        aria-label="Asosiy menyu"
        data-tone="deep"
        className="bg-background border-hairline hidden border-y xl:sticky xl:top-0 xl:z-40 xl:block"
      >
        {/* CENTRED, matching the operator's reference layout. The six section
            labels are short enough in Uzbek to sit as one centred group;
            `flex-wrap` in NavLinks still lets the row break onto a second line
            at 125/150% text rather than running off the edge. */}
        <Container className="flex justify-center">
          <NavLinks />
        </Container>
      </nav>
    </>
  );
}
