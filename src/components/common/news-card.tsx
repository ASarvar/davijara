import { ArrowRight, CalendarDays } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { ImagePlaceholder } from "@/components/common/placeholder/image-placeholder";
import { SurfaceCard } from "@/components/common/surface-card";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { NewsItem } from "@/types/content";

/*
  One news item, in the two sizes the press centre needs.

  ONE COMPONENT, not two, because the difference between the lead article and
  the ones under it is entirely presentational — same fields, same order, same
  link target. The legacy page had `.news-main` and `.news-item` as separate
  blocks with separate hover treatments (a shadow lift on one, a left border
  tint on the other), which is how two things that are the same thing end up
  looking like two things.

  THE WHOLE CARD IS THE LINK. A "Batafsil" anchor inside a clickable card gives
  a keyboard user two tab stops to the same URL and a mouse user a target the
  size of a word; the arrow below is a `<span>` that follows the card's own
  hover state.

  THE IMAGE BOX IS ALWAYS DRAWN, photograph or not. `aspect-[16/10]` reserves
  its height from the first paint, so the day real pictures arrive nothing on
  the page moves — the same reason the lot cards reserve `aspect-video`.
*/
export async function NewsCard({
  item,
  featured = false,
  className,
  ...props
}: {
  item: NewsItem;
  /** The lead article: page-one, top of the list, wide and image-led. */
  featured?: boolean;
} & React.HTMLAttributes<HTMLElement>) {
  const [t, tCat, tCommon] = await Promise.all([
    getTranslations("news"),
    getTranslations("news.categories"),
    getTranslations("common"),
  ]);

  const media = (
    <div
      className={cn(
        "bg-secondary relative overflow-hidden",
        featured
          ? /*
              Side by side the picture takes its height from the text column,
              and a four-line announcement left it a 2.3:1 letterbox. The floor
              keeps the lead card reading as a lead card on a short item.
            */
            "aspect-[16/10] lg:aspect-auto lg:h-full lg:min-h-[20rem]"
          : "aspect-[16/10] w-full",
      )}
    >
      {item.image ? (
        /*
          A plain <img>, not next/image: news art is not configured for the
          optimiser yet and `unoptimized` on next/image buys nothing over this.
          Swap both together when the pictures are self-hosted for real.
        */
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.image}
          alt=""
          className="h-full w-full object-cover transition-transform duration-[600ms] ease-out group-hover:scale-105"
        />
      ) : (
        <ImagePlaceholder />
      )}
    </div>
  );

  return (
    <SurfaceCard
      as="li"
      radius="lg"
      padding="none"
      interactive
      data-reveal="up"
      className={cn("group overflow-hidden", className)}
      {...props}
    >
      <Link
        href={`/yangiliklar/${item.slug}`}
        className={cn(
          "flex h-full",
          /*
            The lead article turns sideways only at `lg`. Below that the
            picture would be a 200px-wide stamp next to a wrapped headline,
            which is worse than the stacked card the other items use.
          */
          featured
            ? "flex-col lg:grid lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] lg:items-stretch"
            : "flex-col",
        )}
      >
        {media}

        <div
          className={cn(
            "flex flex-1 flex-col",
            featured ? "p-6 sm:p-8" : "p-5",
          )}
        >
          <div className="text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-2 text-xs">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays aria-hidden="true" className="size-3.5" />
              {/*
                A machine-readable <time>, which the legacy markup had nowhere —
                its dates were bare text next to a calendar glyph.
              */}
              <time dateTime={item.publishedAt}>
                {formatDate(item.publishedAt)}
              </time>
            </span>
            <span className="border-hairline text-accent-foreground rounded-full border px-2.5 py-0.5 font-semibold">
              {tCat(item.category)}
            </span>
            {featured ? (
              <span className="text-accent-foreground font-semibold tracking-[0.18em] uppercase">
                {t("latest")}
              </span>
            ) : null}
          </div>

          <h3
            className={cn(
              "group-hover:text-accent-foreground mt-3 font-semibold text-balance transition-colors duration-200",
              featured
                ? "font-heading text-xl sm:text-2xl"
                : "text-base sm:text-lg",
            )}
          >
            {item.title}
          </h3>

          <p
            className={cn(
              "text-muted-foreground mt-2 text-pretty",
              featured ? "text-sm sm:text-base" : "text-sm",
            )}
          >
            {item.excerpt}
          </p>

          {/*
            `mt-auto` so the arrow sits on the card's floor whatever the title
            wraps to — three cards in a row with two-, three- and four-line
            titles otherwise put their read-more marks at three different
            heights.
          */}
          <span className="text-accent-foreground mt-auto inline-flex items-center gap-1.5 pt-4 text-sm font-medium">
            {tCommon("readMore")}
            <ArrowRight
              aria-hidden="true"
              className="size-4 transition-transform duration-300 ease-out group-hover:translate-x-1"
            />
          </span>
        </div>
      </Link>
    </SurfaceCard>
  );
}
