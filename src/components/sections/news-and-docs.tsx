import { Download, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getDocuments, getNews } from "@/lib/data/catalog";
import { ActionLink } from "@/components/common/action-link";
import { IconTile } from "@/components/common/icon-tile";
import { SurfaceCard } from "@/components/common/surface-card";
import { Section, SectionHeader } from "@/components/layout/section";
import { formatDate } from "@/lib/format";

export async function NewsAndDocs() {
  const [tn, td] = await Promise.all([
    getTranslations("news"),
    getTranslations("documents"),
  ]);
  const [news, documents] = await Promise.all([getNews(4), getDocuments(4)]);

  return (
    <Section tone="light">
      <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
        {/* News */}
        <div>
          {/*
            `size="compact"` rather than a hand-rolled header. This block used
            to fork SectionHeader, which is how its eyebrow drifted to mb-2
            and its heading to text-2xl while the rest of the site used mb-3
            and text-3xl.
          */}
          <SectionHeader
            size="compact"
            eyebrow={tn("eyebrow")}
            title={tn("title")}
            action={<ActionLink href="/yangiliklar">{tn("action")}</ActionLink>}
          />

          <ul className="divide-border divide-y">
            {news.map((item) => (
              <li
                key={item.slug}
                data-reveal="left"
              >
                <Link
                  href={`/yangiliklar/${item.slug}`}
                  className="group hover:bg-card block rounded-lg px-3 py-5 transition-colors duration-200"
                >
                  <div className="text-muted-foreground flex items-center gap-3 text-xs">
                    {/* <time> with a machine-readable datetime — absent from
                        the legacy markup, which had bare text dates. */}
                    <time dateTime={item.publishedAt}>
                      {formatDate(item.publishedAt)}
                    </time>
                    {item.category ? (
                      <>
                        <span aria-hidden="true">·</span>
                        <span>{item.category}</span>
                      </>
                    ) : null}
                  </div>
                  <h3 className="group-hover:text-accent-foreground mt-2 text-base font-semibold text-balance transition-colors duration-200">
                    {item.title}
                  </h3>
                  <p className="text-muted-foreground mt-1.5 text-sm">
                    {item.excerpt}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Documents */}
        <div>
          <SectionHeader
            size="compact"
            eyebrow={td("eyebrow")}
            title={td("title")}
          />

          <ul className="space-y-3">
            {documents.map((doc) => (
              <SurfaceCard
                as="li"
                key={doc.id}
                radius="md"
                padding="none"
                interactive
                data-reveal="left"
              >
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex gap-3 p-4"
                >
                  <IconTile size="sm">
                    <FileText aria-hidden="true" className="size-4" />
                  </IconTile>
                  <span className="min-w-0 flex-1">
                    <span className="group-hover:text-accent-foreground block text-sm font-medium transition-colors duration-200">
                      {doc.title}
                    </span>
                    <span className="text-muted-foreground mt-1 block text-xs">
                      {doc.reference}
                    </span>
                  </span>
                  <Download
                    aria-hidden="true"
                    className="text-muted-foreground size-4 shrink-0 transition-transform duration-200 group-hover:translate-y-0.5"
                  />
                </a>
              </SurfaceCard>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
