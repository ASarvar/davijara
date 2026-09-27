import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ArrowRight } from "lucide-react";

import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { SurfaceCard } from "@/components/common/surface-card";
import { Section } from "@/components/layout/section";
import { getNavigation } from "@/lib/data/navigation";
import type { NavItem } from "@/content/site";

/*
  Sayt xaritasi — every page of the portal on one screen.

  BUILT FROM THE MENU, NOT LISTED AGAIN. It reads the same merged navigation
  the header renders (lib/data/navigation.ts): the built-in sections with
  their hard-coded routes, plus every page an editor has placed in a menu
  from the panel, under the section's current name. So a section renamed or
  a page added in /admin/menyu appears here with no change to this file, and
  the map can never list a page the menu does not — or miss one it does.

  The closing "Umumiy" group holds the menu's plain top-level links (Bosh
  sahifa, Statistika, Aloqa — entries with no dropdown) and the footer's
  legal pages, this one included, which the menu does not carry.

  Conditional entries (`when`, today only "Joriy savdolar" while enough lots
  are live) are left out, for the reason section-index-page.tsx gives: this
  page is cached for minutes and the condition changes faster than that.

  Deliberately a page for PEOPLE. /sitemap.xml is the one for crawlers
  (app/sitemap.ts); the two answer different questions and are not merged.
*/
const NAV_KEY = "sitemap";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t(NAV_KEY) };
}

/** Footer pages, keyed by their `nav` message. */
const LEGAL: NavItem[] = [
  { key: "privacy", href: "/maxfiylik" },
  { key: "terms", href: "/shartlar" },
  { key: "sitemap", href: "/sayt-xaritasi" },
];

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [t, tMap, nav] = await Promise.all([
    getTranslations("nav"),
    getTranslations("siteMap"),
    getNavigation(locale),
  ]);

  /*
    A panel-created page carries its own already-translated label; a page
    that lives in code carries a message key. See section-index-page.tsx.
  */
  const label = (item: NavItem) => item.label ?? t(item.key);

  const sections = nav
    .map((item) => ({
      ...item,
      children: (item.children ?? []).filter((child) => !child.when),
    }))
    .filter((item) => item.children.length > 0);

  // Bosh sahifa, Statistika, Aloqa — whatever the menu has as a plain link.
  const general: NavItem[] = [
    ...nav.filter((item) => !item.children?.length && !item.when),
    ...LEGAL,
  ];

  const groups = [
    ...sections.map((s) => ({
      key: s.key,
      title: label(s),
      // A section that is only a menu heading has no page of its own.
      href: s.clickable === false ? undefined : s.href,
      items: s.children,
    })),
    { key: "general", title: tMap("general"), href: undefined, items: general },
  ];

  const total = groups.reduce((n, g) => n + g.items.length, 0);

  return (
    <Section tone="deep" className="flex-1">
      <Breadcrumbs items={[{ label: t(NAV_KEY) }]} />

      <h1
        data-split
        className="font-heading text-center text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl"
      >
        {t(NAV_KEY)}
      </h1>
      <p className="text-muted-foreground mt-3 text-center text-sm text-pretty">
        {tMap("lede", { sections: groups.length, pages: total })}
      </p>

      {/*
        Columns rather than a grid: the groups run from two links to a
        dozen, and a grid row would stretch every card to its tallest
        neighbour, leaving holes under the short ones.
      */}
      <div className="mt-10 gap-5 sm:columns-2 lg:columns-3">
        {groups.map((group, index) => (
          <SurfaceCard
            key={group.key}
            as="section"
            padding="lg"
            radius="lg"
            data-reveal="up"
            aria-labelledby={`map-${group.key}`}
            className="mb-5 break-inside-avoid"
          >
            <h2
              id={`map-${group.key}`}
              className="font-heading flex items-baseline gap-3 text-lg font-semibold text-balance"
            >
              <span
                aria-hidden="true"
                className="text-accent-foreground font-mono text-xs tabular-nums"
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              {group.href ? (
                <Link
                  href={group.href}
                  className="hover:text-accent-foreground underline-offset-4 hover:underline"
                >
                  {group.title}
                </Link>
              ) : (
                group.title
              )}
            </h2>

            <ul className="border-hairline mt-4 space-y-1 border-l pl-4">
              {group.items.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className="group text-muted-foreground hover:text-foreground flex items-start gap-2 py-1 text-sm transition-colors"
                  >
                    <ArrowRight
                      aria-hidden="true"
                      className="text-accent-foreground mt-0.5 size-3.5 shrink-0 transition-transform duration-200 group-hover:translate-x-0.5"
                    />
                    <span className="text-pretty">{label(item)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </SurfaceCard>
        ))}
      </div>
    </Section>
  );
}
