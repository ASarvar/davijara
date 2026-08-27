import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CalendarDays, RefreshCw } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { mediaSrc } from "@/lib/media/src";

import { type Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { getArticle, getRelatedNews } from "@/lib/data/news";
import { formatDate } from "@/lib/format";
import { BlockContent } from "@/components/common/block-content";
import { ImagePlaceholder } from "@/components/common/placeholder/image-placeholder";
import { NewsAside } from "@/components/sections/news-aside";
import { Section } from "@/components/layout/section";

/*
  A single news item.

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

/*
  NOT PRERENDERED AT BUILD TIME ANY MORE, and that is a deliberate reversal.

  While articles lived in a TypeScript module, `generateStaticParams` over
  every slug was free and obviously right. Now they live in the admin panel's
  database, and building the list would mean `next build` opening that
  database — which on the server is the wrong thing twice over:

    * deploy.sh runs the build as the deploying user (root), while the service
      runs as `davijara`. A database or WAL file created by the build would be
      owned by root, and the panel's first write would fail with a permission
      error long after the deploy reported success.
    * an article published from the panel would not exist as a page until the
      next deploy, which defeats the point of having a panel.

  Instead each article renders on first request and is cached for the window
  below. `revalidatePath` in the panel's publish action clears it immediately,
  so a published item is live at once; `revalidate` is the backstop that heals
  the cache within five minutes if a revalidation is ever missed.
*/
export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}): Promise<Metadata> {
  const { locale, slug } = await params;
  const article = await getArticle(slug, locale);
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

  const article = await getArticle(slug, locale);
  if (!article) notFound();

  const [t, tCat, tNav, tCommon] = await Promise.all([
    getTranslations("news"),
    getTranslations("news.categories"),
    getTranslations("nav"),
    getTranslations("common"),
  ]);
  // Four, to fill the sidebar column beside the text.
  const related = await getRelatedNews(slug, 4, locale);

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
                src={mediaSrc(article.image)}
                alt=""
                className="h-full w-full object-cover"
              />
            ) : (
              <ImagePlaceholder />
            )}
          </div>

          {/*
            NO NARROWER MEASURE THAN THE PICTURE. The text used to sit in a
            `max-w-[68ch]` column while the image spanned the full width above
            it, so the article had two left-to-right extents and the paragraphs
            read as though they had been indented by accident. The column is
            already ~768px at the widest — inside the comfortable range on its
            own — so the sidebar, not a second cap, is what keeps the line
            length honest.

            The excerpt IS the lead paragraph, set one step up from the body
            and not repeated further down: carrying the summary twice on one
            page is how a short announcement ends up looking padded.
          */}
          <div>
            <p
              data-enter
              style={{ "--enter-delay": 1 } as React.CSSProperties}
              className="text-foreground/90 mt-6 text-lg text-pretty"
            >
              {article.excerpt}
            </p>

            {/*
              The body, as the blocks the editor composed. It was
              `body: string[]` — one paragraph per string — until the admin
              panel arrived; migration 2 converted every one of those into a
              paragraph block, so nothing was lost and the shape simply got
              wider. BlockContent is where the "plain text only, never HTML"
              guarantee is kept.
            */}
            <BlockContent blocks={article.blocks} className="mt-2" />

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
