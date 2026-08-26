import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, RefreshCw } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing, type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getArticle, getNewsSlugs, getRelatedNews } from "@/lib/data/news";
import { formatDate } from "@/lib/format";
import { ImagePlaceholder } from "@/components/common/placeholder/image-placeholder";
import { NewsAside } from "@/components/sections/news-aside";
import { Section } from "@/components/layout/section";

/*
  A single news item.

  PRERENDERED, NOT DYNAMIC. `generateStaticParams` covers every slug in every
  locale, so an article is a static file — which matters more here than on the
  catalogue, whose pages depend on a live auction service. Nothing about a
  published announcement changes between requests.

  This route sits beside three static siblings (`/yangiliklar/ozbekiston`,
  `/bayonotlar`, `/media`). Next resolves static segments before dynamic ones,
  so those keep their own pages; anything else falls through to here and, if it
  is not a real slug, to `notFound()` rather than to an empty article.

  TWO COLUMNS, and the second one is the way out of the page. There was an
  older/newer pair of buttons under the text as well; it went, because it and
  the sidebar answered the same question and the buttons answered it worse —
  by position in a list, which tells a reader nothing about what they are
  about to open.
*/

export async function generateStaticParams() {
  const slugs = await getNewsSlugs();
  return routing.locales.flatMap((locale) =>
    slugs.map((slug) => ({ locale, slug })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const article = await getArticle(slug);
  if (!article) return {};

  return {
    title: article.title,
    description: article.excerpt,
    openGraph: {
      type: "article",
      title: article.title,
      description: article.excerpt,
      publishedTime: article.publishedAt,
      modifiedTime: article.updatedAt,
    },
  };
}

export default async function ArticlePage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale as Locale);

  const article = await getArticle(slug);
  if (!article) notFound();

  const [t, tCat, tNav, tCommon] = await Promise.all([
    getTranslations("news"),
    getTranslations("news.categories"),
    getTranslations("nav"),
    getTranslations("common"),
  ]);
  // Four, to fill the sidebar column beside the text.
  const related = await getRelatedNews(slug, 4);

  return (
    <Section tone="deep">
      <nav aria-label="Breadcrumb" className="mb-6">
        <ol className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
          <li>
            <Link
              href="/"
              className="hover:text-accent-foreground transition-colors"
            >
              {tCommon("breadcrumbHome")}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link
              href="/yangiliklar"
              className="hover:text-accent-foreground transition-colors"
            >
              {tNav("newsCentre")}
            </Link>
          </li>
          {/*
            The headline is NOT repeated as a third crumb. It is already the
            <h1> two lines below, and a 90-character title wraps the crumb
            trail to three lines on a phone to tell the reader something the
            page is about to shout.
          */}
        </ol>
      </nav>

      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem] lg:gap-12">
        <article>
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2 text-sm">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="size-4" />
              <time dateTime={article.publishedAt}>
                {formatDate(article.publishedAt)}
              </time>
            </span>
            {/*
              A badge, not a link. It was a link to `?kategoriya=…` while the
              list page had a topic filter; that filter is gone, so the link
              would now land on the unfiltered feed and quietly do nothing.
            */}
            <span className="border-hairline text-accent-foreground rounded-full border px-2.5 py-0.5 text-xs font-semibold">
              {tCat(article.category)}
            </span>
          </div>

          <h1
            data-enter
            className="font-heading mt-4 text-3xl font-semibold text-balance sm:text-4xl"
          >
            {article.title}
          </h1>

          {/*
            The same picture the reader just clicked, at the top of what it
            belongs to. `aspect-[16/9]` reserves the box whether or not there
            is a photograph yet, so adding one shifts nothing below it.
          */}
          <div className="bg-secondary border-border mt-6 aspect-[16/9] w-full overflow-hidden rounded-xl border">
            {article.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={article.image}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <ImagePlaceholder />
            )}
          </div>

          {/*
            `max-w-[68ch]` on the text below the picture — a measure that runs
            the full width of a wide column is a measure nobody finishes a line
            of. The excerpt IS the lead paragraph, set one step up from the
            body and not repeated further down: carrying the summary twice on
            one page is how a short announcement ends up looking padded.
          */}
          <div className="max-w-[68ch]">
            <p
              data-enter
              style={{ "--enter-delay": 1 } as React.CSSProperties}
              className="text-foreground/90 mt-6 text-lg text-pretty"
            >
              {article.excerpt}
            </p>

            {article.body?.length ? (
              <div className="text-muted-foreground mt-6 space-y-4 text-pretty">
                {article.body.map((paragraph, i) => (
                  <p key={i}>{paragraph}</p>
                ))}
              </div>
            ) : null}

            {article.updatedAt ? (
              <p className="text-muted-foreground mt-8 inline-flex items-center gap-1.5 text-xs">
                <RefreshCw aria-hidden="true" className="size-3.5" />
                {t("updated", { date: formatDate(article.updatedAt) })}
              </p>
            ) : null}
          </div>
        </article>

        <NewsAside items={related} />
      </div>
    </Section>
  );
}
