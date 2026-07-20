import { ArrowRight, Download, FileText } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getDocuments, getNews } from "@/lib/data/catalog";
import { Section } from "@/components/layout/section";
import { formatDate } from "@/lib/format";

export async function NewsAndDocs() {
  const [tn, td] = await Promise.all([
    getTranslations("news"),
    getTranslations("documents"),
  ]);
  const [news, documents] = await Promise.all([getNews(4), getDocuments(4)]);

  return (
    <Section tone="deep">
      <div className="grid gap-12 lg:grid-cols-[1.3fr_1fr]">
        {/* News */}
        <div>
          <div className="mb-7">
            <p className="text-accent-foreground mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
              {tn("eyebrow")}
            </p>
            <div className="flex items-end justify-between gap-4">
              <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
                {tn("title")}
              </h2>
              <Link
                href="/yangiliklar"
                className="text-accent-foreground inline-flex shrink-0 items-center gap-1.5 text-sm font-medium hover:underline"
              >
                {tn("action")}
                <ArrowRight aria-hidden="true" className="size-4" />
              </Link>
            </div>
          </div>

          <ul className="divide-border divide-y">
            {news.map((item) => (
              <li key={item.slug}>
                <Link
                  href={`/yangiliklar/${item.slug}`}
                  className="hover:bg-card group block py-5 transition-colors"
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
                  <h3 className="group-hover:text-accent-foreground mt-2 text-base font-semibold text-balance transition-colors">
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
          <div className="mb-7">
            <p className="text-accent-foreground mb-2 text-xs font-semibold tracking-[0.18em] uppercase">
              {td("eyebrow")}
            </p>
            <h2 className="font-heading text-2xl font-semibold sm:text-3xl">
              {td("title")}
            </h2>
          </div>

          <ul className="space-y-3">
            {documents.map((doc) => (
              <li key={doc.id}>
                <a
                  href={doc.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="border-border bg-card hover:border-[color:var(--color-gold)]/40 group flex gap-3 rounded-lg border p-4 transition-colors"
                >
                  <span className="bg-accent text-accent-foreground flex size-9 shrink-0 items-center justify-center rounded-md">
                    <FileText aria-hidden="true" className="size-4" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="group-hover:text-accent-foreground block text-sm font-medium transition-colors">
                      {doc.title}
                    </span>
                    <span className="text-muted-foreground mt-1 block text-xs">
                      {doc.reference}
                    </span>
                  </span>
                  <Download
                    aria-hidden="true"
                    className="text-muted-foreground size-4 shrink-0"
                  />
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Section>
  );
}
