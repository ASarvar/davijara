import { RotateCcw, Search } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { cn } from "@/lib/utils";

/*
  The trailing cell of every search band — Qidirish, and Tozalash beside it
  once something is filtered.

  ONE COMPONENT because three copies had drifted: the catalogue's button went
  cobalt (operator, 21.08.2026) while the sold-results and contract-register
  panels kept the old gold one, so the same action wore two colours a click
  apart.

  TOZALASH IS A LINK, not a reset button. `<button type="reset">` only puts the
  fields back to the values the page was rendered with — which, on a filtered
  page, ARE the filters — so it could never clear a search. The link goes to
  the unfiltered page; the caller builds it, because only the caller knows
  which parameters are filters and which (the open tab, the market) are not.
  Shown only while something is filtered: on a clean page it would be a
  control that does nothing.

  `resetHref` must already carry the base path — like the forms' `action`,
  it is raw HTML that Next never rewrites.
*/
export async function FilterActions({
  resetHref,
  compact = false,
  className,
}: {
  resetHref?: string;
  /**
   * For a ONE-ROW panel, where these actions sit in the grid's trailing
   * `auto` column beside four fields. That column is sized by what is in it,
   * so a Tozalash that appeared only once something was filtered resized the
   * column — and every field in the row with it — on each search (operator,
   * 19.10.2026: "layout buzilib ketyapti"). Tucking it into the label line
   * above the button instead left a 24px icon floating over Qidirish, which
   * the operator rejected the same day.
   *
   * A dimmed square held in its place while nothing was filtered was
   * rejected too: the reset must not show at all until a filter is used
   * (operator, 19.10.2026).
   *
   * So from `lg` the CELL is a fixed width — the square, the gap and the
   * button side by side — and Qidirish stretches to fill whatever the
   * square leaves. Unfiltered, the button is the whole cell; filtered, it
   * gives up 52px to the square. The column, and every field beside it, is
   * the same width in both states. The width is in rem so it scales with the
   * text-size setting along with the button's own label. Each panel's grid
   * gives its Hudud column 1.2 shares, because "Qoraqalpog'iston
   * Respublikasi" is the value that clips first.
   */
  compact?: boolean;
  className?: string;
}) {
  const t = await getTranslations("search");
  const square =
    "border-input bg-card text-muted-foreground inline-flex size-11 shrink-0 items-center justify-center rounded-md border";

  return (
    <div
      className={cn("flex items-end gap-2", compact && "lg:w-44", className)}
    >
      {resetHref ? (
        /*
          An icon button, no word (operator, 19.10.2026). The word is still
          its accessible name and its tooltip, so a screen reader and a
          hovering mouse both get "Tozalash".

          A square in the field style (card ground, input border) so it reads
          as a control of this panel, beside the filled primary button.
        */
        <a
          href={resetHref}
          aria-label={t("reset")}
          title={t("reset")}
          className={cn(
            square,
            "hover:text-foreground hover:border-ring/50 focus-visible:ring-ring group transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none",
          )}
        >
          <RotateCcw
            aria-hidden="true"
            className="size-4 transition-transform duration-300 group-hover:-rotate-90"
          />
        </a>
      ) : null}
      <button
        type="submit"
        /* `active:scale` because the transition already declared `transform`
           but nothing ever changed it — the button animated opacity only and
           felt inert on press. */
        className={cn(
          "focus-visible:ring-ring group inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-[color:var(--color-cobalt)] px-6 text-sm font-semibold text-[color:var(--color-mist-pale)] transition-[opacity,transform] duration-200 ease-out hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98]",
          !compact && "lg:flex-none",
        )}
      >
        <Search
          aria-hidden="true"
          className="size-4 transition-transform duration-200 group-hover:scale-110"
        />
        {t("submit")}
      </button>
    </div>
  );
}
