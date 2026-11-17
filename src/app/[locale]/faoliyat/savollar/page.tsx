import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { BlockContent } from "@/components/common/block-content";
import { Section } from "@/components/layout/section";
import { FaqAccordion } from "@/components/sections/faq";
import { getFaq } from "@/lib/data/catalog";
import { getPageByNavKey } from "@/lib/data/pages";
import { localeAlternates } from "@/lib/seo";

/*
  "Koʻp beriladigan savollar" under Faoliyat — the same questions the
  homepage ends on, ALL of them (operator, 16.11.2026: the page was the empty
  "being prepared" placeholder while the homepage had the answers). They come
  from getFaq(), the homepage's own source, so a question added there shows
  here too.

  An editor can still write an introduction for this route in the panel; it
  renders above the questions, the way /hujjatlar/loyihalar does it.

  The name lives in `messages/*.json` under `nav`, exactly once — see the
  note on `navKey` in placeholder-page.tsx.
*/
const NAV_KEY = "faq";

// The panel's introduction can change without a deploy; see the note above.
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [tNav, tMeta] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "meta" }),
  ]);
  return {
    alternates: localeAlternates(locale, "/faoliyat/savollar"),
    title: tNav(NAV_KEY),
    description: tMeta("descriptions.faq"),
  };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [items, intro, tNav] = await Promise.all([
    getFaq(undefined, locale),
    getPageByNavKey(NAV_KEY, locale),
    getTranslations("nav"),
  ]);
  const blocks = intro?.blocks ?? [];

  return (
    <Section tone="deep" className="flex-1">
      <Breadcrumbs items={[{ label: tNav(NAV_KEY) }]} />

      <div className="mx-auto max-w-3xl">
        <h1
          data-split
          className="font-heading text-center text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl"
        >
          {tNav(NAV_KEY)}
        </h1>
        {blocks.length > 0 && <BlockContent blocks={blocks} className="mt-2" />}
      </div>

      <div className="mt-10">
        <FaqAccordion items={items} />
      </div>
    </Section>
  );
}
