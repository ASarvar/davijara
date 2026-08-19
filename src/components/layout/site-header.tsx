import { LogIn, Mail, Phone } from "lucide-react";
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
 * Site header — a thin utility strip stacked above the navigation row.
 *
 *     ┌─ phone · email ───────────── a11y · lang ─┐   navy-mid
 *     ├───────────────────────────────────────────┤
 *     └─ LOGO ── nav links ─────────── Kirish ────┘   navy
 *
 * Two full-bleed bars, each with its own `Container`, so the tinted strip runs
 * edge to edge while its contents still line up with the logo below. The two
 * tones are what separate the rows; there is no rule between them beyond the
 * strip's own bottom border.
 *
 * WHY THE NAV APPEARS AT `xl` AND NOT `lg`
 * The seven nav labels are long in Uzbek and measure ~782px together. Added to
 * the logo, the Kirish button and the gaps, the row needs ~1150px inside a
 * 1200px container. At `lg` (1024px) that overflows the viewport — and a
 * `1fr` grid/flex track will not shrink below its content — so 1024–1279px
 * uses the sheet menu instead. If you add a nav item, re-measure at 1280.
 *
 * On a handset the utility strip has to stay on one line or the sticky header
 * eats ~130px of a 667px screen: hence the email hidden below `sm` and the
 * accessibility trigger going icon-only (with `sr-only` text — never an
 * unlabelled icon, least of all on the accessibility control).
 */
export async function SiteHeader() {
  const t = await getTranslations("nav");
  const tTopbar = await getTranslations("topbar");

  return (
    <header data-tone="deep" className="sticky top-0 z-40">
      {/* ── Utility strip ──────────────────────────────────────────────── */}
      {/* `bg-band`, not `bg-navy-mid`: the token collapses to black in high
          contrast, so the strip does not stay navy while the rest of the page
          goes black. See --band in globals.css. */}
      <div className="bg-band border-hairline border-b">
        {/* 0.78125rem === 12.5px at the default root size — same rendering as
            a `text-[12.5px]`, but rem-based, so the strip scales with the
            "Matn o'lchami" accessibility setting instead of ignoring it. */}
        <Container className="text-muted-foreground relative flex items-center justify-between gap-x-5 py-2 text-[0.78125rem]">
          {/* Not a decorative chip — this deploy is a real test rollout of a
              government portal, and CLAUDE.md's accuracy-first rule extends
              to not letting it read as final. Styled as an official tag
              (gold accent + status dot), the same visual language as the
              active language chip below, rather than an alarm-red error
              badge — a state portal disclosing its own status is routine,
              not a fault condition. Centred over the strip via absolute
              positioning rather than a real flex slot: with `justify-between`
              already spreading the contact links and the a11y/lang controls
              to the two edges, a middle flex child would land wherever their
              widths happen to leave off, not at the true centre. Hidden below
              `sm`, same threshold as the email link, because centring it on a
              375px row would sit it on top of the phone number. */}
          <div className="pointer-events-none absolute inset-0 hidden items-center justify-center sm:flex">
            {/* pointer-events restored here, on the badge alone — the
                wrapper above spans the full strip so it can centre this,
                but must stay click-through or it would sit on top of the
                phone/email/lang controls and swallow their clicks. */}
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
                must hear "Sinov rejimi", not a string of separate letters.

                The letters live in their own wrapper rather than as direct
                children of the badge: the badge is `gap-1.5`, which would
                otherwise open a 6px gap between every character.

                Not a flex row and not inline-block per letter — plain inline
                spans animating only colour and opacity. That keeps the text
                in normal inline flow, so the space between the two words
                behaves like a space and nothing has to re-create kerning.
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
                          label is. A per-letter delay in ms cannot do that:
                          tuned for "Sinov rejimi" it was 80ms, and this label
                          — nearly three times longer — pushed the last letter
                          to a 2.3s delay inside a 2.6s cycle, leaving the
                          wave restarting before it had finished crossing.
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

          <div className="flex min-w-0 items-center gap-x-5">
            <a
              href={contacts.phoneHref}
              className="hover:text-accent-foreground flex items-center gap-1.5 transition-colors"
            >
              <Phone aria-hidden="true" className="size-3.5 shrink-0" />
              {contacts.phone}
            </a>

            <a
              href={contacts.emailHref}
              className="hover:text-accent-foreground hidden items-center gap-1.5 transition-colors sm:flex"
            >
              <Mail aria-hidden="true" className="size-3.5 shrink-0" />
              {contacts.email}
            </a>
          </div>

          {/* LangSwitcher hidden for now — the site is only being shown in
              Uzbek at this stage. ru/en routes and messages stay in place
              underneath; this is a UI-visibility decision, not a locale
              removal, so re-adding the control is a one-line change. */}
          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            {/* Theme first, then the accessibility dialog: this one is a
                single-tap switch, the other opens a panel, and the lighter
                control reads better closest to the content it changes. */}
            <ThemeToggle />
            <AccessibilityDialog />
          </div>
        </Container>
      </div>

      {/* ── Navigation row ─────────────────────────────────────────────── */}
      <div className="bg-background border-hairline border-b">
        {/* gap-4, not gap-6: `justify-between` already spreads the three items
            across the row, so the gap is only ever a MINIMUM — it changes
            nothing visually here but costs 16px of the ~30px the nav has left
            at 1280. Keep it small. */}
        <Container className="flex items-center justify-between gap-4 py-3">
          <Link
            href="/"
            className="flex shrink-0 items-center"
            aria-label={site.name}
          >
            <Logo variant="header" priority />
          </Link>

          {/* NavLinks hides itself below xl; the wrapper stays so the landmark
              is not conditionally rendered. */}
          <nav aria-label="Asosiy menyu" className="min-w-0">
            <NavLinks />
          </nav>

          <div className="flex shrink-0 items-center gap-2">
            <Link
              href="/kirish"
              className="text-accent-foreground hover:bg-accent focus-visible:ring-ring border-outline hidden shrink-0 items-center gap-1.5 rounded-sm border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none xl:inline-flex"
            >
              <LogIn aria-hidden="true" className="size-3.5" />
              {t("login")}
            </Link>

            {/* Sheet trigger; hides itself from xl up. */}
            <MobileNav />
          </div>
        </Container>
      </div>
    </header>
  );
}
