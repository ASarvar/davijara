import { getTranslations } from "next-intl/server";
import { mediaSrc } from "@/lib/media/src";

import { Link } from "@/i18n/navigation";
import { ImagePlaceholder } from "@/components/common/placeholder/image-placeholder";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NewsItem } from "@/types/content";

/*
  A news item as a ROW — thumbnail left, text right.

  The third shape a news item takes, after the card on /yangiliklar and the
  lead card above it, and the only one that appears twice: in the article
  page's sidebar and in the homepage's news column. Those two were written
  separately at first and had already drifted apart on thumbnail size before
  this was extracted — which is the same story `SurfaceCard` and `IconTile`
  record, so it is not a story worth repeating.

  A FIXED SQUARE, not an aspect ratio. These stack in a column, and a
  thumbnail whose height follows its own image turns the column's left edge
  into a staircase.
*/
export async function NewsRow({
  item,
  size = "sm",
  showExcerpt = false,
  showCategory = false,
  className,
}: {
  item: NewsItem;
  /** `sm` for the article sidebar, `md` for the wider homepage column. */
  size?: "sm" | "md";
  /**
   * The homepage has the width for a summary line; the 20rem sidebar does
   * not, where it would wrap to two words per line and add nothing to the
   * decision to click.
   */
  showExcerpt?: boolean;
  showCategory?: boolean;
  className?: string;
}) {
  const tCat = await getTranslations("news.categories");
  const md = size === "md";

  return (
    <Link
      href={`/yangiliklar/${item.slug}`}
      className={cn(
        "group flex gap-3",
        md
          ? "hover:bg-card rounded-lg p-3 transition-colors duration-200 sm:gap-4"
          : "p-3.5",
        className,
      )}
    >
      <span
        className={cn(
          "bg-secondary relative shrink-0 overflow-hidden rounded-md",
          md ? "size-20 sm:size-24" : "size-16",
        )}
      >
        {item.image ? (
          /*
            A plain <img>, not next/image — news art is not configured for the
            optimiser yet. Swap both together when the pictures are
            self-hosted for real.
          */
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={mediaSrc(item.image)}
            alt=""
            className="h-full w-full object-cover transition-transform duration-500 ease-out group-hover:scale-105"
          />
        ) : (
          <ImagePlaceholder />
        )}
      </span>

      <span className="min-w-0 flex-1">
        <span className="text-muted-foreground flex flex-wrap items-center gap-x-2 text-xs">
          {/* A machine-readable <time>, which the legacy markup had nowhere. */}
          <time dateTime={item.publishedAt}>
            {formatDate(item.publishedAt)}
          </time>
          {showCategory ? (
            <>
              <span aria-hidden="true">·</span>
              {/* The topic is a SLUG on the record; its label is translated,
                  so this and the chip on /yangiliklar are one string. */}
              <span>{tCat(item.category)}</span>
            </>
          ) : null}
        </span>

        <span
          className={cn(
            "group-hover:text-accent-foreground mt-1 block font-semibold text-pretty transition-colors duration-200",
            md ? "text-base" : "text-sm font-medium",
          )}
        >
          {item.title}
        </span>

        {showExcerpt ? (
          <span className="text-muted-foreground mt-1.5 block text-sm">
            {item.excerpt}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
