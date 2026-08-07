import { LogIn, Mail, Phone } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { contacts, site } from "@/content/site";
import { Container } from "./section";
import { Logo } from "./logo";
import { NavLinks } from "./nav-links";
import { MobileNav } from "./mobile-nav";
import { LangSwitcher } from "./lang-switcher";
import { AccessibilityDialog } from "./accessibility-dialog";

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
        <Container className="text-muted-foreground flex items-center justify-between gap-x-5 py-2 text-[0.78125rem]">
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

          <div className="flex shrink-0 items-center gap-3 sm:gap-4">
            <AccessibilityDialog />
            <LangSwitcher />
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
