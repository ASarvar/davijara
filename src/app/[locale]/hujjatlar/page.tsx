import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { ExternalLink } from "lucide-react";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import type { Locale } from "@/i18n/routing";
import { Section } from "@/components/layout/section";
import { IconTile } from "@/components/common/icon-tile";
import { Button } from "@/components/ui/button";
import { getLegalDocuments } from "@/lib/data/legal-documents";

/*
  Hujjatlar — "Sohaga doir normativ-huquqiy hujjatlar roʻyxati", the
  Centre's own list of the laws and decrees its work rests on, each linking
  out to its lex.uz citation. Supplied whole by the operator (2026-08-28);
  see lib/data/legal-documents.ts for sourcing notes.

  Same numbered divided-list shape as eng-kam-stavkalar and
  korrupsiyaga-qarshi — a document register, not a card grid.
*/

const NAV_KEY = "documentsMain";

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

export default async function DocumentsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [tNav, tCommon, t, documents] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    getTranslations("documents"),
    getLegalDocuments(),
  ]);

  return (
    <Section tone="deep">
      <Breadcrumbs items={[{ label: tNav(NAV_KEY) }]} />

      <div className="mx-auto">
        <h1
          data-split
          className="font-heading text-center text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl"
        >
          {tNav(NAV_KEY)}
        </h1>
        <p className="text-muted-foreground mt-3 text-center text-sm text-pretty">
          {t("pageLede")}
        </p>

        {documents.length === 0 ? (
          <p className="border-hairline text-muted-foreground mt-8 rounded-lg border border-dashed px-4 py-6 text-center text-sm text-pretty">
            {t("empty")}
          </p>
        ) : (
          <ul
            data-reveal="up"
            className="border-hairline divide-hairline mt-10 divide-y overflow-hidden rounded-sm border"
          >
            {documents.map((doc, index) => (
              <li
                key={doc.title}
                className="flex flex-wrap items-center gap-3 px-4 py-3 sm:flex-nowrap sm:gap-4 sm:px-5"
              >
                <IconTile
                  size="sm"
                  aria-hidden="true"
                  className="font-heading shrink-0 text-sm font-semibold"
                >
                  {String(index + 1).padStart(2, "0")}
                </IconTile>
                <span className="min-w-0 flex-1 text-sm text-pretty sm:text-base">
                  {doc.title}
                </span>
                <div className="flex shrink-0 flex-wrap justify-end gap-2">
                  {doc.links.map((link, i) => (
                    <Button key={i} asChild variant="outline" size="sm">
                      <a href={link.href} target="_blank" rel="noopener noreferrer">
                        <ExternalLink aria-hidden="true" />
                        {link.label ?? tCommon("view")}
                      </a>
                    </Button>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Section>
  );
}
