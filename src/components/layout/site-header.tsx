import { Phone } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { contacts, site } from "@/content/site";
import { Container } from "./section";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { MobileNav } from "./mobile-nav";
import { getNavigation } from "@/lib/data/navigation";
import { AccessibilityDialog } from "./accessibility-dialog";
import { SocialLinks } from "./social-links";
import { LangSwitcher } from "./lang-switcher";
import { ThemeToggle } from "./theme-toggle";

/**
 * Site header — a tall brand band above a centred navigation bar.
 *
 *     ┌─ LOGO ─── theme · a11y · phone · tg ig fb · UZ RU ─┐  brand band
 *     ├────────────────────────────────────────────────────┤
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
  const tCommon = await getTranslations("common");
  const tMeta = await getTranslations("meta");

  /*
    The menu is assembled HERE, on the server, and handed to the two client
    nav components as a prop.

    They used to import `mainNav` directly, which was right while the menu was
    a static module. It no longer is: pages added through the admin panel are
    merged into it, and that read needs the database and the request's locale
    — neither of which a client component has. See lib/data/navigation.ts.
  */
  const navItems = await getNavigation(await getLocale());

  return (
    <header data-tone="deep" className="sticky top-0 z-40">
      {/* ── Brand band ─────────────────────────────────────────────────── */}
      <div className="bg-band">
        {/* The band's height is set by the logo, not by this padding; the
            controls beside it are one row now (10.11.2026), shorter than the
            logo. The padding is only what keeps the logo off the band's
            edges. */}
        <Container className="relative flex items-center justify-between gap-4 py-2 xl:py-3">
          <Link
            href="/"
            className="flex shrink-0 items-center"
            aria-label={site.name}
          >
            <Logo variant="header" priority alt={tMeta("title")} />
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
          {/* <div className="pointer-events-none absolute inset-0 hidden items-center justify-center sm:flex">
            <span
              title={tTopbar("testModeDescription")}
              className="border-outline bg-accent text-accent-foreground pointer-events-auto flex items-center gap-1.5 rounded-sm border px-2 py-0.5 text-xs font-medium"
            >
              <span
                aria-hidden="true"
                className="bg-accent-foreground size-1.5 shrink-0 rounded-full"
              />
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
          </div> */}

          {/*
            ONE ROW beside the logo, in the operator's order (10.11.2026):

              theme · accessibility · phone · social marks · language

            It was a three-row stack (controls / "Telefon" + number / social
            marks) until then. The "Telefon" caption is gone at the
            operator's request: the handset icon already says what the number
            is, and its `tel:` link is what a phone acts on.

            `text-sm` (15px on this project's scale): it is the phone number a
            citizen is squinting at.
          */}
          <div className="text-muted-foreground hidden items-center gap-5 text-sm xl:flex">
            <ThemeToggle />
            <AccessibilityDialog />
            <a
              href={contacts.phoneHref}
              className="hover:text-accent-foreground flex items-center gap-1.5 whitespace-nowrap transition-colors"
            >
              <Phone aria-hidden="true" className="size-3.5 shrink-0" />
              {contacts.phone}
            </a>
            <SocialLinks className="flex items-center gap-3" />
            <LangSwitcher />
          </div>

          {/*
            Below `xl` the same order, with the sheet trigger at the end — the
            brand band IS the whole header at that width.

            NO SOCIAL MARKS on this row (operator, 10.11.2026): they live at
            the foot of the menu sheet (mobile-nav.tsx) instead, and in the
            footer.

            The phone is the handset icon alone below `md`. The number stays
            in the link as screen-reader text, so it is still what is
            announced, and the `tel:` link is what a phone acts on anyway.
          */}
          <div className="text-muted-foreground flex shrink-0 items-center gap-2.5 sm:gap-3 xl:hidden">
            <ThemeToggle />
            <AccessibilityDialog />
            <a
              href={contacts.phoneHref}
              className="hover:text-accent-foreground flex items-center gap-1.5 text-sm whitespace-nowrap transition-colors"
            >
              <Phone aria-hidden="true" className="size-4 shrink-0" />
              <span className="sr-only md:not-sr-only">{contacts.phone}</span>
            </a>
            <LangSwitcher />
            <MobileNav items={navItems} />
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
          <NavLinks items={navItems} />
        </Container>
      </nav>
    </header>
  );
}
