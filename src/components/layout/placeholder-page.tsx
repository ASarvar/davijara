import { Construction } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { BlockContent } from "@/components/common/block-content";
import { IconTile } from "@/components/common/icon-tile";
import { getPageByNavKey } from "@/lib/data/pages";
import { Section } from "./section";

/**
 * Stand-in for sections that exist in the navigation but have no content yet.
 *
 * The legacy site pointed six of eight nav items at `href="#"`. Rather than
 * carry dead links across, each has a real route that renders this — the
 * information architecture is honest, nothing 404s, and each page can be
 * replaced independently as content arrives.
 */
export async function PlaceholderPage({
  navKey,
  descriptionKey,
}: {
  /**
   * Key in the `nav` namespace — the page's title comes from the SAME string
   * the menu item uses.
   *
   * Passing the title as literal text was how this started, and it meant the
   * label existed twice for every one of these 22 routes: once in `nav` for
   * the menu, once in the page for the heading, plus a third copy in each
   * file's `metadata`. Three copies of "Rahbariyat qabul kunlari" is three
   * places for it to drift, and the menu and the page it opens disagreeing
   * about their own name is the drift that shows.
   */
  navKey: string;
  /**
   * Key in the `placeholder` namespace for a section-specific line, e.g.
   * `documents`. Falls back to the generic "this section is being prepared"
   * when the section has nothing more particular to say.
   */
  descriptionKey?: string;
}) {
  const t = await getTranslations("placeholder");
  const tNav = await getTranslations("nav");

  /*
    CONTENT FIRST, PLACEHOLDER SECOND.

    Every one of these 26 routes is a real file that has always rendered the
    "being prepared" panel below. Now that editors can write pages, the same
    route serves whatever they wrote — and none of those 26 files had to
    change, because `page-routes.ts` maps the navKey they already pass to the
    path the database stores against.

    An unregistered navKey, an unwritten page, or a draft all fall through to
    the placeholder. That is the safe direction: the worst case is a citizen
    seeing the honest "not ready yet" panel that was there before.
  */
  const locale = await getLocale();
  const page = await getPageByNavKey(navKey, locale);

  if (page && page.blocks.length > 0) {
    return (
      <Section tone="deep" className="flex-1">
        <div className="max-w-3xl">
          {/*
            The heading comes from `nav`, NOT from the page's own title field.
            The menu item and the page it opens are the same name, and the
            note on `navKey` above explains what happens when that string
            exists in two places.
          */}
          <h1
            data-split
            className="font-heading text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl"
          >
            {tNav(navKey)}
          </h1>
          <BlockContent blocks={page.blocks} className="mt-2" />
        </div>
      </Section>
    );
  }

  return (
    <Section tone="deep" className="flex-1">
      <div className="mx-auto max-w-xl py-5 text-center">
        <IconTile size="lg" className="mx-auto mb-6">
          <Construction aria-hidden="true" className="size-7" />
        </IconTile>
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl lg:text-5xl">
          {tNav(navKey)}
        </h1>
        <p className="text-muted-foreground mt-4 text-pretty">
          {descriptionKey ? t(descriptionKey) : t("description")}
        </p>
        <Button asChild className="mt-8">
          <Link href="/">{t("action")}</Link>
        </Button>
      </div>
    </Section>
  );
}
