import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import { NEWS_PER_PAGE, getNews } from "@/lib/data/news";
import { parsePage } from "@/lib/data/listings";
import { NewsCard } from "@/components/common/news-card";
import { Section } from "@/components/layout/section";

/*
  Markaz yangiliklari — the press centre's own feed.

  THE NAME COMES FROM `nav.newsCentre`, the same string the menu item uses, so
  the menu and the page it opens cannot disagree about their own title. That is
  the rule the 30 placeholder routes follow (see placeholder-page.tsx); this
  page keeps it now that it has real content.

  NO TOPIC FILTER. There was one — chips over `?kategoriya=`, counts derived
  from the store — and it came out at the operator's request. It is the right
  call at this size: four items across four topics gave every chip a count of
  one, so each "filter" was a one-item page and the strip cost a whole band of
  the layout to remove three items from a list nobody had to scroll. Topics
  still exist on the records and on the cards; if the feed grows to where
  filtering earns its place, the chips are in this file's history.

  PAGINATION STAYS IN THE URL. `?sahifa=` is read on the server, so each page
  of the feed is its own address — linkable, back-button-correct, crawlable —
  and this route ships no page-level JavaScript.
*/

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const [tNav, t] = await Promise.all([
    getTranslations({ locale, namespace: "nav" }),
    getTranslations({ locale, namespace: "news" }),
  ]);
  return { title: tNav("newsCentre"), description: t("metaDescription") };
}

export default async function NewsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const [{ locale }, sp] = await Promise.all([params, searchParams]);
  setRequestLocale(locale as Locale);

  const [t, tNav, tCommon] = await Promise.all([
    getTranslations("news"),
    getTranslations("nav"),
    getTranslations("common"),
  ]);

  const items = await getNews();
  const pageCount = Math.max(1, Math.ceil(items.length / NEWS_PER_PAGE));
  // Clamped, not 404'd — a hand-edited ?sahifa=99 lands on the last real page.
  const current = Math.min(parsePage(sp), pageCount);
  const shown = items.slice(
    (current - 1) * NEWS_PER_PAGE,
    current * NEWS_PER_PAGE,
  );

  /*
    The lead article is the newest item, and only on the first page. On page
    two the widest card would be pointing at the tenth-newest item and calling
    it the latest — which on a state feed is a statement of fact, and the wrong
    one.
  */
  const featured = current === 1 ? shown[0] : undefined;
  const rest = featured ? shown.slice(1) : shown;

  const pageHref = (n: number) =>
    n > 1 ? `/yangiliklar?sahifa=${n}` : "/yangiliklar";

  return (
    <>
      <Section tone="deep" className="pb-4">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="text-muted-foreground flex items-center gap-2 text-sm">
            <li>
              <Link
                href="/"
                className="hover:text-accent-foreground transition-colors"
              >
                {tCommon("breadcrumbHome")}
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">{tNav("newsCentre")}</li>
          </ol>
        </nav>

        {/*
          The heading stands alone. The count-and-last-updated line that used
          to sit under it told a reader nothing the first card does not already
          show them, one line lower, with its date printed on it.
        */}
        <h1
          data-enter
          className="font-heading max-w-3xl text-3xl font-semibold text-balance sm:text-4xl lg:text-5xl"
        >
          {tNav("newsCentre")}
        </h1>
      </Section>

      <Section tone="deep">
        {shown.length > 0 ? (
          <>
            {featured ? (
              <ul className="mb-5">
                <NewsCard item={featured} featured />
              </ul>
            ) : null}

            {rest.length > 0 ? (
              <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
                {rest.map((item, i) => (
                  <NewsCard
                    key={item.slug}
                    item={item}
                    style={{ "--i": i } as React.CSSProperties}
                  />
                ))}
              </ul>
            ) : null}

            {pageCount > 1 ? (
              <nav
                aria-label={t("pagination")}
                className="mt-10 flex flex-wrap items-center justify-center gap-2"
              >
                {/* Real links, one URL per page — as on the catalogue pager. */}
                {Array.from({ length: pageCount }, (_, i) => i + 1)
                  .filter(
                    (n) =>
                      n === 1 || n === pageCount || Math.abs(n - current) <= 2,
                  )
                  .map((n, i, list) => (
                    <span key={n} className="flex items-center gap-2">
                      {i > 0 && list[i - 1] !== n - 1 ? (
                        <span
                          aria-hidden="true"
                          className="text-muted-foreground"
                        >
                          …
                        </span>
                      ) : null}
                      <Link
                        href={pageHref(n)}
                        aria-current={n === current ? "page" : undefined}
                        className={
                          n === current
                            ? "border-outline bg-accent text-accent-foreground rounded-md border px-3 py-1.5 text-sm font-semibold tabular-nums"
                            : "border-hairline text-muted-foreground hover:text-accent-foreground hover:border-outline rounded-md border px-3 py-1.5 text-sm tabular-nums transition-colors"
                        }
                      >
                        {n}
                      </Link>
                    </span>
                  ))}
              </nav>
            ) : null}
          </>
        ) : (
          <p className="border-hairline text-muted-foreground rounded-lg border border-dashed px-6 py-12 text-center text-sm">
            {t("empty")}
          </p>
        )}
      </Section>
    </>
  );
}
