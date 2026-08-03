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
 * Site header — utility strip and main navigation as one block.
 *
 * From `xl` up the brand occupies a tall left column and the two rows stack to
 * its right:
 *
 *     ┌───────┬──────────────── phone · email · a11y · lang ──┐
 *     │ LOGO  ├───────────────────────────────────────────────┤
 *     └───────┴─ nav links ─────────────────────── Kirish ────┘
 *
 * A two-column grid with an explicitly-placed brand spanning both rows does
 * this directly — which is why the old topbar and navbar had to merge: the
 * logo must be a sibling of both rows to span them.
 *
 * WHY `xl` AND NOT `lg`
 * The seven nav labels are long in Uzbek and measure 782px together. With the
 * brand column, the Kirish button, the gaps and the container gutters, this
 * layout needs ~1214px. Applying it at `lg` (1024px) overflowed the viewport
 * by ~160px — the nav and Kirish ran off the right edge — because a `1fr`
 * grid track defaults to `min-width: auto` and refuses to shrink below its
 * content. Squeezing seven items into 1024px would need ~6px of padding at
 * 12.5px, which is not a real option. So the full layout starts at `xl`, and
 * 1024–1279px (tablet landscape, small laptops) uses the sheet menu.
 *
 * Tracks are `minmax(0, 1fr)` rather than `1fr` so the content column can
 * always shrink; that is the guard that stops any future long label from
 * pushing the header wider than the screen again.
 *
 * Below `xl` the grid collapses to a flex column: the thin utility strip sits
 * on top, then the brand row with the sheet trigger.
 */
export async function SiteHeader() {
  const t = await getTranslations("nav");

  return (
    <header
      data-tone="deep"
      className="bg-background border-hairline sticky top-0 z-40 border-b p-4"
    >
      <Container
        className={
          "flex flex-col " +
          // Brand column is pinned to the logo's own rendered width rather
          // than sized `auto`: Chromium measures an `auto` track next to a
          // <picture>-swapped <img> from the fallback source's intrinsic
          // 57×69, not the 218×48 the wordmark actually paints at, and the
          // image then overflowed into the utilities column.
          "xl:grid xl:grid-cols-[218px_minmax(0,1fr)] xl:gap-x-10"
        }
      >
        {/* ── Utility strip ──────────────────────────────────────────────
            Order-1 on small screens so it reads as a strip above the brand,
            the conventional government-portal arrangement. Explicit grid
            placement takes over at xl. */}
        {/* 0.78125rem === 12.5px at the default root size — same rendering as
            the old `text-[12.5px]`, but rem-based so the strip scales with the
            "Matn o'lchami" accessibility setting rather than ignoring it. */}
        <div className="border-border text-muted-foreground order-1 flex w-full flex-wrap items-center justify-end gap-x-5 gap-y-1 border-b py-2 text-[0.78125rem] xl:order-0 xl:col-start-2 xl:row-start-1">
          <a
            href={contacts.phoneHref}
            className="hover:text-accent-foreground ml-auto flex items-center gap-1.5 transition-colors"
          >
            <Phone aria-hidden="true" className="size-3.5" />
            {contacts.phone}
          </a>

          <a
            href={contacts.emailHref}
            className="hover:text-accent-foreground hidden items-center gap-1.5 transition-colors sm:flex"
          >
            <Mail aria-hidden="true" className="size-3.5" />
            {contacts.email}
          </a>

          <AccessibilityDialog />
          <LangSwitcher />
        </div>

        {/* ── Brand ──────────────────────────────────────────────────── */}
        <div className="order-2 flex items-center justify-between gap-4 py-3 xl:order-0 xl:col-start-1 xl:row-span-2 xl:row-start-1 xl:py-4">
          <Link
            href="/"
            className="flex shrink-0 items-center"
            aria-label={site.name}
          >
            <Logo variant="header" priority />
          </Link>

          {/* Sheet trigger; hidden from xl up where the full nav appears. */}
          <MobileNav />
        </div>

        {/* ── Navigation ─────────────────────────────────────────────── */}
        {/* gap-4, not gap-6: the header's own p-4 costs 32px of horizontal
            room, which left the nav row with exactly zero slack at 1280 and
            wrapped it onto a second line even at the default text size. */}
        <div className="order-3 hidden items-center justify-between gap-4 pt-2 xl:order-none xl:col-start-2 xl:row-start-2 xl:flex">
          <nav aria-label="Asosiy menyu" className="min-w-0">
            <NavLinks />
          </nav>

          <Link
            href="/kirish"
            className="text-accent-foreground hover:bg-accent focus-visible:ring-ring border-outline inline-flex shrink-0 items-center gap-1.5 rounded-sm border px-3.5 py-1.5 text-sm font-medium transition-colors focus-visible:ring-2 focus-visible:outline-none"
          >
            <LogIn aria-hidden="true" className="size-3.5" />
            {t("login")}
          </Link>
        </div>
      </Container>
    </header>
  );
}
