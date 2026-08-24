import { ArrowRight } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { mainNav } from "@/content/site";
import { SurfaceCard } from "@/components/common/surface-card";
import { Section } from "./section";

/**
 * A section's own page: the list of pages inside it.
 *
 * "Faoliyat" and "Ochiq ma'lumotlar" are headings in the menu, not pages the
 * operator wrote — but `NavItem` requires every parent to be a real link,
 * because a section header that cannot be clicked is a dead end for anyone
 * who reaches it by keyboard. The alternative, pointing the parent at
 * `PlaceholderPage`, would answer that click with "tayyorlanmoqda" for a
 * section whose children exist.
 *
 * So the parent renders its OWN children, read from `mainNav` rather than
 * listed again here — the menu and this page cannot drift apart, and adding a
 * child to the section adds it in both places at once.
 */
export async function SectionIndexPage({
  /** The `key` of the entry in `mainNav` whose children this page lists. */
  navKey,
}: {
  navKey: string;
}) {
  const t = await getTranslations("nav");
  const section = mainNav.find((item) => item.key === navKey);
  const children = section?.children ?? [];

  return (
    <Section tone="deep" className="flex-1">
      {/*
        The section name is the page's ONE heading, not an eyebrow repeating
        the h1 beneath it. Printing it twice — as a label and again as a title
        — is what the first draft did, and a screen reader simply hears the
        same words back to back.
      */}
      <h1 className="font-heading text-3xl font-semibold sm:text-4xl">
        {t(navKey)}
      </h1>

      <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {children.map((child) => (
          <li key={child.href}>
            {/*
              The whole card is the link, not a "batafsil" at the bottom of
              it: there is exactly one destination per card, so anything less
              than the full surface is a smaller target for no reason.
            */}
            <Link href={child.href} className="group block h-full">
              <SurfaceCard
                interactive
                padding="lg"
                radius="lg"
                className="flex h-full items-start justify-between gap-4"
              >
                <span className="font-heading text-lg leading-snug font-semibold text-balance">
                  {t(child.key)}
                </span>
                <ArrowRight
                  aria-hidden="true"
                  className="text-accent-foreground mt-1 size-5 shrink-0 transition-transform duration-300 group-hover:translate-x-1"
                />
              </SurfaceCard>
            </Link>
          </li>
        ))}
      </ul>
    </Section>
  );
}
