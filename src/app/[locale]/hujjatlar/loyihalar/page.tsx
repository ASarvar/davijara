import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { CalendarDays, Download, Eye, FileText } from "lucide-react";

import type { Locale } from "@/i18n/routing";
import { Breadcrumbs } from "@/components/common/breadcrumbs";
import { BlockContent } from "@/components/common/block-content";
import { IconTile } from "@/components/common/icon-tile";
import { PlaceholderPage } from "@/components/layout/placeholder-page";
import { Section } from "@/components/layout/section";
import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/base-path";
import { getDocumentDrafts } from "@/lib/data/document-drafts";
import { getPageByNavKey } from "@/lib/data/pages";
import { formatDate, formatNumber } from "@/lib/format";

/*
  The page's name lives in `messages/*.json` under `nav`, exactly once, and
  both the browser-tab title and the on-page heading read it from there — see
  the note on `navKey` in placeholder-page.tsx.
*/
const NAV_KEY = "documentsDrafts";

/*
  Cached, not static-forever: an editor can still write an introduction for
  this route in the panel, and it renders above the document list.
  `revalidatePath` in the panel's publish action clears it at once; this
  window is the backstop.
*/
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

/*
  A register of downloadable documents — the files are the content, so each
  row leads with the document's own title and gives it two actions: open it
  in the browser's viewer, or save it. The shape follows /eng-kam-stavkalar
  (a divided list inside one hairline frame) with more room per row, because
  a title here is a sentence rather than a region name.

  With no documents and no panel text this is still the "being prepared"
  placeholder it always was.
*/
export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [docs, intro] = await Promise.all([
    getDocumentDrafts(),
    getPageByNavKey(NAV_KEY, locale),
  ]);
  const blocks = intro?.blocks ?? [];

  if (docs.length === 0) return <PlaceholderPage navKey={NAV_KEY} />;

  const [tNav, tCommon, t] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    getTranslations("documentDrafts"),
  ]);

  return (
    <Section tone="deep" className="flex-1">
      <Breadcrumbs items={[{ label: tNav(NAV_KEY) }]} />

      <div className="mx-auto max-w-4xl">
        <h1
          data-split
          className="font-heading text-center text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl"
        >
          {tNav(NAV_KEY)}
        </h1>

        {blocks.length > 0 && <BlockContent blocks={blocks} className="mt-2" />}

        <ul
          data-reveal="up"
          className="border-hairline divide-hairline bg-card mt-10 divide-y overflow-hidden rounded-md border [box-shadow:var(--shadow-1)]"
        >
          {docs.map((doc) => {
            const href = withBasePath(doc.file);
            return (
              <li
                key={doc.id}
                className="flex flex-col gap-4 px-4 py-5 sm:flex-row sm:items-start sm:gap-5 sm:px-6"
              >
                <IconTile size="md" aria-hidden="true" className="shrink-0">
                  <FileText className="size-5" />
                </IconTile>

                <div className="min-w-0 flex-1">
                  <h2 className="font-heading text-base font-semibold text-balance sm:text-lg">
                    {doc.title}
                  </h2>
                  <p className="mt-1 text-sm text-pretty">{doc.subject}</p>
                  <p className="text-muted-foreground mt-1 text-sm text-pretty">
                    {doc.issuer}
                  </p>
                  <p className="text-muted-foreground mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays aria-hidden="true" className="size-3.5" />
                      <time dateTime={doc.date}>{formatDate(doc.date)}</time>
                    </span>
                    {doc.sizeBytes != null && (
                      <span>
                        {t("fileMeta", {
                          size: formatNumber(Math.ceil(doc.sizeBytes / 1024)),
                        })}
                      </span>
                    )}
                  </p>
                </div>

                <div className="flex shrink-0 gap-2 sm:flex-col">
                  {/*
                    Plain anchors to a public/ file — Next's basePath rewriting
                    covers only its own <Link> and asset URLs. See
                    lib/base-path.ts.
                  */}
                  <Button asChild size="sm">
                    <a href={href} download>
                      <Download aria-hidden="true" />
                      {tCommon("download")}
                    </a>
                  </Button>
                  <Button asChild variant="outline" size="sm">
                    <a href={href} target="_blank" rel="noopener noreferrer">
                      <Eye aria-hidden="true" />
                      {tCommon("view")}
                    </a>
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      </div>
    </Section>
  );
}
