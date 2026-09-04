import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import type { Locale } from "@/i18n/routing";
import { Section } from "@/components/layout/section";
import { IconTile } from "@/components/common/icon-tile";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { sections, closingStatement } from "@/content/anticorruption";

/*
  Korrupsiyaga qarshi kurashish — the Centre's anti-corruption disclosure.

  Supplied whole by the operator as a .docx (src/content/anticorruption.ts
  has the full transcription note). PLAIN TEXT AS AN ACCORDION, at the
  operator's explicit request: thirteen numbered sections, same numbered-tile
  language `PrivilegeList` already uses for the 24 statutory privileges, one
  Accordion boundary over all of them rather than 13 separate client
  islands. Unlike markaz/page.tsx and markaz/vazifalar/page.tsx this page has
  no single decree it was "established by", so there is no citation line
  under the title — inventing one would be exactly what CLAUDE.md's "never
  invent facts" rule exists to prevent.
*/

const NAV_KEY = "anticorruption";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tNav = await getTranslations({ locale, namespace: "nav" });
  return { title: tNav(NAV_KEY) };
}

export default async function AnticorruptionPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [tNav] = await Promise.all([
    getTranslations("nav"),
  ]);

  return (
    <Section tone="deep">
      <Breadcrumbs items={[{ label: tNav("centre"), href: "/markaz" }, { label: tNav(NAV_KEY) }]} />

      <div className="mx-auto ">
        <h1
          data-split
          className="font-heading text-center text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl"
        >
          {tNav(NAV_KEY)}
        </h1>

        {/*
          ONE bordered, divided list — not a stack of individually-rounded
          cards. SurfaceCard's own radius (--radius-xl, 28px) plus its
          hover-lift and gold-border-on-hover read as decoration on a page
          that is otherwise plain text, and the 13 rounded corners fighting
          each other down the column was the actual complaint. `rounded-md`
          here is --radius-md (14px) — a full step down the scale in
          globals.css, on the outer container only; each row is a plain
          border-bottom, same language as the official-naming `<dl>` in
          markaz/page.tsx.
        */}
        <Accordion
          type="multiple"
          className="border-hairline divide-hairline mt-8 divide-y overflow-hidden rounded-md border"
        >
          {sections.map((section, index) => (
            <AccordionItem
              key={section.heading}
              value={String(index)}
              className="border-0"
            >
              <AccordionTrigger className="hover:bg-secondary/60 gap-4 rounded-none px-4 py-3 text-left transition-colors hover:no-underline sm:px-5">
                <span className="flex flex-1 items-start gap-3">
                  <IconTile
                    size="sm"
                    aria-hidden="true"
                    className="font-heading text-sm font-semibold"
                  >
                    {String(index + 1).padStart(2, "0")}
                  </IconTile>
                  <span className="min-w-0 flex-1 text-base font-semibold text-balance">
                    {section.heading}
                  </span>
                </span>
              </AccordionTrigger>

              <AccordionContent className="px-4 pb-4 pl-[3.75rem] sm:px-5">
                <div className="space-y-3">
                  {section.paragraphs.map((paragraph, i) => (
                    <p
                      key={i}
                      className="text-muted-foreground text-sm text-pretty"
                    >
                      {paragraph}
                    </p>
                  ))}
                </div>

                {section.items ? (
                  <>
                    {section.listIntro ? (
                      <p className="text-foreground/90 mt-3 text-sm font-medium text-pretty">
                        {section.listIntro}
                      </p>
                    ) : null}
                    <ol className="text-foreground/90 marker:text-muted-foreground mt-3 list-decimal space-y-2 pl-5 text-sm text-pretty">
                      {section.items.map((item, i) => (
                        <li key={i}>{item}</li>
                      ))}
                    </ol>
                  </>
                ) : null}

                {section.closingParagraphs?.length ? (
                  <div className="mt-3 space-y-3">
                    {section.closingParagraphs.map((paragraph, i) => (
                      <p
                        key={i}
                        className="text-muted-foreground text-sm text-pretty"
                      >
                        {paragraph}
                      </p>
                    ))}
                  </div>
                ) : null}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>

        {/*
          The document's own closing line — bold in the source, set off here
          as a banner rather than folded into section 13's body, so it keeps
          the emphasis the source gave it instead of reading as one more
          sentence inside an already-long accordion item. Same border-hairline
          + rounded-md language as the list above, not a SurfaceCard.
        */}
        <div className="border-hairline bg-secondary/40 mt-6 rounded-md border px-4 py-5 text-center sm:px-5">
          <p className="font-heading text-lg font-semibold text-balance sm:text-xl">
            {closingStatement}
          </p>
        </div>
      </div>
    </Section>
  );
}
