import { ChevronDown, SlidersHorizontal } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Container } from "@/components/layout/section";

/*
  The search band around every catalogue filter — and, below `lg`, a
  "Filtrlar" bar that folds it away.

  WHY FOLD. On a phone the catalogue's panel is five full-width fields and a
  button: one whole screen (measured at 375px: the first result card started
  below the fold) before a single result. Folded, the bar is one row, and
  the count chip still says a search is active.

  WHY A CHECKBOX AND NOT STATE. The bar is a `<label>` for a visually hidden
  checkbox, and the panel shows with `peer-checked`. That works with no
  JavaScript at all — the rule every filter here is held to (CLAUDE.md:
  filter state in the URL, a plain GET form) — and it renders folded from the
  first paint, so there is no flash of the open panel collapsing after
  hydration. Desktop never sees the bar: from `lg` the panel is always shown
  and the checkbox is `display: none`, so it is not an extra tab stop.

  Starts FOLDED even with filters active: the reader has just run that search
  and came for its results; the chip says how many filters are on.
*/
export async function FilterBand({
  id,
  activeCount,
  children,
}: {
  /** Unique per page — the checkbox and its label are paired by it. */
  id: string;
  /** Filters currently narrowing the results, for the bar's chip. */
  activeCount: number;
  children: React.ReactNode;
}) {
  const t = await getTranslations("search");

  return (
    <section data-tone="deep" className="bg-band border-hairline border-y">
      <Container className="py-4 lg:py-12">
        <input type="checkbox" id={id} className="peer sr-only lg:hidden" />
        <label
          htmlFor={id}
          className="border-input bg-card text-foreground hover:border-ring/50 peer-focus-visible:ring-ring flex h-11 cursor-pointer items-center justify-between gap-3 rounded-md border px-4 text-sm font-medium transition-colors duration-200 select-none peer-focus-visible:ring-2 lg:hidden peer-checked:[&_.filter-chevron]:rotate-180"
        >
          <span className="inline-flex items-center gap-2">
            <SlidersHorizontal
              aria-hidden="true"
              className="text-accent-foreground size-4"
            />
            {t("filters")}
            {activeCount > 0 ? (
              <>
                <span
                  aria-hidden="true"
                  className="bg-accent text-accent-foreground rounded-full px-2 py-px text-xs font-semibold tabular-nums"
                >
                  {activeCount}
                </span>
                <span className="sr-only">
                  {t("activeCount", { count: activeCount })}
                </span>
              </>
            ) : null}
          </span>
          <ChevronDown
            aria-hidden="true"
            className="filter-chevron size-4 transition-transform duration-300"
          />
        </label>
        <div className="hidden pt-4 peer-checked:block lg:block lg:pt-0">
          {children}
        </div>
      </Container>
    </section>
  );
}
