import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { ImagePlaceholder } from "@/components/common/placeholder/image-placeholder";
import { SurfaceCard } from "@/components/common/surface-card";
import { formatDate } from "@/lib/format";
import type { NewsItem } from "@/types/content";

/*
  "Boshqa yangiliklar" as a sidebar column beside the article, not as a row of
  cards under it.

  A reader who has finished the text is already at the bottom of the page; a
  grid down there is only found by scrolling past the end of what they came
  for. In the sidebar the same four items are visible from the first screen and
  stay in view while the article scrolls (`lg:sticky`), which is what makes
  them a way through the section rather than a footer.

  ONE ROW, NOT A CARD, per item. `NewsCard` at 320px would be a thumbnail with
  a two-word line of body copy under it — the excerpt is dropped here on
  purpose, leaving the date and the headline, which is all a decision to click
  actually needs.
*/
export async function NewsAside({ items }: { items: NewsItem[] }) {
  if (items.length === 0) return null;
  const t = await getTranslations("news");

  return (
    <aside className="lg:sticky lg:top-28">
      <h2 className="mb-4 text-base font-semibold">{t("related")}</h2>

      <SurfaceCard as="section" radius="lg" padding="none">
        <ul className="divide-border divide-y">
          {items.map((item) => (
            <li key={item.slug}>
              <Link
                href={`/yangiliklar/${item.slug}`}
                className="group flex gap-3 p-3.5"
              >
                {/*
                  A fixed 64px square rather than an aspect ratio: these sit in
                  a column of four and any variation in thumbnail height turns
                  the list's left edge into a staircase.
                */}
                <span className="bg-secondary relative size-16 shrink-0 overflow-hidden rounded-md">
                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={item.image}
                      alt=""
                      className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
                    />
                  ) : (
                    <ImagePlaceholder />
                  )}
                </span>

                <span className="min-w-0 flex-1">
                  <time
                    dateTime={item.publishedAt}
                    className="text-muted-foreground block text-xs"
                  >
                    {formatDate(item.publishedAt)}
                  </time>
                  <span className="group-hover:text-accent-foreground mt-1 block text-sm font-medium text-pretty transition-colors duration-200">
                    {item.title}
                  </span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </SurfaceCard>
    </aside>
  );
}
