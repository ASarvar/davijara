import { Building2, Landmark } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { formatNumber } from "@/lib/format";
import { MARKET_KEY, type ListingsMarket } from "@/lib/listings-view";
import { cn } from "@/lib/utils";

/*
  "Ijara | Xususiylashtirish" — which offer the homepage explorer shows.

  ABOVE the Xarita / Hududlar tabs and drawn larger than them, because it is
  the level above them: it picks the set, the tabs pick how to look at it.
  As a third tab beside those two it read as one more view of the same
  leases (operator, 09.10.2026).

  Two LINKS, not buttons: the choice lives in the URL (MARKET_KEY), so it is
  a navigation — linkable, back-button correct, and the server sends only the
  set being shown. `scroll={false}` keeps the reader where they are.

  WHAT A SWITCH CARRIES: the place (`hudud`, `tuman`) and the open tab. The
  area, price and day bands do NOT cross over — a sale's "500 mln — 1,5 mlrd"
  read as a yearly rent finds nothing, and the lease's "0 — 10 m²" holds no
  sale lot. Each count below is for the set the reader would land on, so it is
  computed with the same rule by the caller.

  The selected side is a filled surface plus weight, not colour alone — it
  has to survive high contrast, where every ink is white.
*/
export async function MarketSwitch({
  market,
  counts,
  searchParams,
}: {
  market: ListingsMarket;
  counts: Record<ListingsMarket, number>;
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const t = await getTranslations("objects");

  const first = (key: string) => {
    const v = searchParams[key];
    return Array.isArray(v) ? v[0] : v;
  };

  const hrefFor = (target: ListingsMarket) => {
    const params = new URLSearchParams();
    for (const key of ["hudud", "tuman", "korinish"]) {
      const value = first(key);
      if (value) params.set(key, value);
    }
    if (target === "xususiylashtirish") params.set(MARKET_KEY, target);
    const qs = params.toString();
    return qs ? `/?${qs}` : "/";
  };

  const options: {
    value: ListingsMarket;
    label: string;
    Icon: typeof Building2;
  }[] = [
    { value: "ijara", label: t("marketLease"), Icon: Building2 },
    { value: "xususiylashtirish", label: t("marketSale"), Icon: Landmark },
  ];

  return (
    /*
      Underlined text tabs, not a boxed segmented control. The first version
      was a bordered card holding two pills, the active one outlined — read
      as heavy, and as one more pill row stacked on the Xarita / Hududlar
      pills right under it (operator, 09.10.2026). A rule across the full
      width with a 2px bar under the chosen offer is lighter, and a different
      SHAPE from the tabs below, which is what says "this is the level above".

      State is never colour alone: the active side is semibold, its count
      chip is filled, and the bar is drawn — all three survive high contrast.
      Hover grows a hairline bar from the left, a motion cue rather than a
      hue.
    */
    <nav aria-label={t("marketLabel")} className="mb-6">
      <ul className="border-hairline flex gap-6 border-b sm:gap-9">
        {options.map(({ value, label, Icon }) => {
          const active = value === market;
          return (
            <li key={value}>
              <Link
                href={hrefFor(value)}
                scroll={false}
                aria-current={active ? "true" : undefined}
                className={cn(
                  "group focus-visible:ring-ring relative -mb-px inline-flex items-center gap-2 rounded-t-sm pt-1 pb-3 text-sm transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none sm:text-base",
                  "after:absolute after:inset-x-0 after:bottom-0 after:h-0.5 after:origin-left after:rounded-full after:transition-transform after:duration-300 after:ease-out",
                  active
                    ? "text-foreground after:bg-accent-foreground font-semibold after:scale-x-100"
                    : "text-muted-foreground hover:text-foreground after:bg-border font-medium after:scale-x-0 hover:after:scale-x-100",
                )}
              >
                <Icon
                  aria-hidden="true"
                  className={cn(
                    "size-4 shrink-0 transition-colors duration-200",
                    active
                      ? "text-accent-foreground"
                      : "group-hover:text-foreground",
                  )}
                />
                {label}
                <span
                  className={cn(
                    "rounded-full px-2 py-px text-xs font-medium tabular-nums transition-colors duration-200",
                    active
                      ? "bg-accent text-accent-foreground"
                      : "bg-secondary text-muted-foreground",
                  )}
                >
                  {formatNumber(counts[value])}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
