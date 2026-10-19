import { getLocale, getTranslations } from "next-intl/server";

import { withBasePath } from "@/lib/base-path";
import { getRegionOptions } from "@/lib/data/catalog";
import {
  AUCTION_DAY_KEY,
  AUCTION_WINDOW_KEY,
  FILTER_KEYS,
  getAuctionDays,
  getDistrictsByRegion,
  getPublishedDays,
  parseListingQuery,
  PUBLISHED_DAY_KEY,
  VIEW_KEY,
} from "@/lib/data/listings";
import {
  getPrivatizationAuctionDays,
  getPrivatizationDistrictsByRegion,
} from "@/lib/data/privatization";
import {
  isListingsView,
  LISTINGS_SORTS,
  MARKET_KEY,
  parseSort,
  SORT_KEY,
  type ListingsMarket,
} from "@/lib/listings-view";
import { RegionDistrictFields } from "./region-district-fields";
import { AuctionDayField } from "@/components/common/auction-day-field";
import { Eyebrow } from "@/components/common/eyebrow";
import { FilterActions } from "@/components/common/filter-actions";
import { FilterBand } from "@/components/common/filter-band";
import { ALL_VALUE, SelectField } from "@/components/common/select-field";

/*
  The bands for a SALE, from the privatization lots themselves (09.10.2026,
  546 priced, 556 with an area): starting price quartiles 538 mln / 1,4 mlrd /
  4,5 mlrd with a tail past 13 mlrd; area quartiles 275 / 605 / 1 355 m².

  The lease bands could not be reused: a sale's starting price is a building's
  value, not a year's rent, so "100 mln+" — the lease panel's top band — holds
  nearly every sale lot, and "0-10 m²" holds none. Values are in the same
  grammar (`narx` in millions of so'm, `maydon` in m²), so parseListingQuery
  reads them unchanged.
*/
const SALE_AREA_BANDS = [
  { value: "0-200", label: "0 — 200" },
  { value: "200-500", label: "200 — 500" },
  { value: "500-1500", label: "500 — 1500" },
  { value: "1500-5000", label: "1500 — 5000" },
  { value: "5000-", label: "5000+" },
];

/*
  Values only; the labels are in messages/ (`search.saleBands.b1`…`b5`),
  because "mln"/"mlrd" are words — Russian reads them "млн"/"млрд".
*/
const SALE_PRICE_BANDS = [
  { value: "0-500", key: "b1" },
  { value: "500-1500", key: "b2" },
  { value: "1500-5000", key: "b3" },
  { value: "5000-15000", key: "b4" },
  { value: "15000-", key: "b5" },
] as const;

/*
  The lease price bands, in millions of so'm a year. Labels in messages/
  (`search.leaseBands`) for the same reason as the sale's: they used to sit in
  the markup as "1 — 5 mln", and /ru printed "mln" where it says "млн".
*/
const LEASE_PRICE_BANDS = [
  { value: "0-1", key: "b1" },
  { value: "1-5", key: "b2" },
  { value: "5-20", key: "b3" },
  { value: "20-100", key: "b4" },
  { value: "100-", key: "b5" },
] as const;

/**
 * Object search.
 *
 * The legacy version was four bare `<select>` elements — not wrapped in a
 * form — beside a button with no handler. Nothing was submittable.
 *
 * This is a real GET form targeting /ijaraga-obyektlar, so results stay addressable
 * as ?hudud=&tuman=&maydon=&narx=&savdo= and a search can be linked and
 * indexed. The
 * dropdowns are shadcn's `Select` (Radix, client JS) rather than native
 * `<select>` elements — a deliberate trade against the zero-JS approach, made
 * so the open dropdown panel can carry the site's rounded/gold-bordered
 * styling, which Chromium won't apply to a native `<select>` popup. Radix's
 * hidden bubble `<select>` still submits `name=value` on this form, so GET
 * submission keeps working with no `onSubmit` handler of our own.
 */
export async function SearchWidget({
  /**
   * Where the form submits. Defaults to the homepage's own explorer anchor, so
   * a search filters the map and region list directly below the panel instead
   * of navigating away. /ijaraga-obyektlar passes its own path to filter in place.
   */
  action,
  /**
   * Current values from the URL. Without these the form resets to "Barcha
   * hududlar" after each submit, so the user cannot see what is filtered or
   * change one field without re-entering the rest.
   */
  values,
  /**
   * Render "Savdo kuni" — the auction-date calendar — on a second row.
   *
   * OFF on the homepage, on purpose. That panel is the site's front door and
   * four fields is what it has always been; a reader thinking about dates is
   * offered the chips on "Yaqinlashayotgan savdolar" instead. The catalogue is
   * where a date is worth combining with region, area and price, so
   * /ijaraga-obyektlar turns it on.
   */
  auctionDay = false,
  /**
   * Render WITHOUT the band — no section, no background, no rules.
   *
   * The homepage sets this and places the panel inside `<Hero>`, so the four
   * fields sit on the hero's own gradient directly beneath the stat cards and
   * the masthead reads as one block. As its own `bg-band` section it drew a
   * horizontal seam across the top of the page and split a single idea —
   * "here is the state of things, now search it" — into two slabs.
   *
   * /ijaraga-obyektlar keeps the band: there the panel IS a distinct control strip
   * between the page heading and the results, and it needs its own surface to
   * say so.
   */
  nested = false,
  /**
   * Which offer the panel searches. `xususiylashtirish` swaps in the sale
   * bands above, the districts and auction days of the sale lots, and the
   * "Boshlang'ich narx" label — so /xususiylashtirish and the homepage's
   * Xususiylashtirish switch get the same panel as the lease catalogue,
   * filled with numbers that fit a sale.
   */
  market = "ijara",
}: {
  action?: string;
  values?: Record<string, string | string[] | undefined>;
  auctionDay?: boolean;
  nested?: boolean;
  market?: ListingsMarket;
} = {}) {
  const sale = market === "xususiylashtirish";
  const t = await getTranslations("search");
  const td = await getTranslations("auctionDay");
  const tp = await getTranslations("privatization");
  const locale = await getLocale();
  const regions = await getRegionOptions();

  /** Reads a param back, falling back to the "all" sentinel. */
  const current = (key: string) => {
    const raw = values?.[key];
    const v = Array.isArray(raw) ? raw[0] : raw;
    return v && v.length > 0 ? v : ALL_VALUE;
  };

  // The whole region→district map, so the tuman dropdown can narrow the
  // instant a region is picked rather than after a submit. Reads through the
  // same cached per-region fetches the results do.
  const districtsByRegion = sale
    ? await getPrivatizationDistrictsByRegion()
    : await getDistrictsByRegion();

  /*
    The days the calendar may offer, scoped to the rest of the active search —
    so filtering to one tuman greys out every day that tuman has no auction on.
    Only fetched for the variant that renders the calendar; the homepage panel
    pays nothing for a control it does not show.
  */
  /*
    "Eʼlon qilingan sana" — leases only. The sale lots come from the
    dashboard, which carries no publication date, so the field would offer a
    calendar of nothing. Fetched alongside the auction days; both scope to
    the rest of the search the same way.
  */
  const published = auctionDay && !sale;
  const query = parseListingQuery(values ?? {});
  const [auctionDays, publishedDays] = await Promise.all([
    auctionDay
      ? sale
        ? getPrivatizationAuctionDays(query)
        : getAuctionDays(query)
      : Promise.resolve([]),
    published ? getPublishedDays(query) : Promise.resolve([]),
  ]);
  const dayLabels = {
    placeholder: td("placeholder"),
    clear: td("clear"),
    months: td.raw("months") as string[],
    weekdays: td.raw("weekdays") as string[],
    // `raw`, not `td("lots")`: the {count} is substituted in the browser once
    // a day is known, so ICU must not try to resolve it here — there is no
    // value to give it yet.
    lots: td.raw("lots") as string,
  };

  /*
    `bg-band` + `border-hairline`, not `bg-navy-mid` + `border-border`: raw
    brand values do not flip in accessibility mode, so this panel used to stay
    navy — with a near-invisible edge — while the rest of the page went black.
    Same fix as the header's utility strip.
  */
  /*
    The panel itself, identical in both variants — only what wraps it changes.
    Extracted so the band and the nested placement cannot drift apart; they
    were two copies of this markup for about ten minutes and that is exactly
    how the two rows of a form start disagreeing about their gap.
  */
  /*
    Where Tozalash goes: this page with no filter on it, but with what is NOT
    a filter kept — the open tab, the homepage's market, the upcoming strip's
    day window — so clearing a search does not also switch the view.
  */
  const sort = values ? parseSort(values) : "sana";
  const filtered = FILTER_KEYS.some((key) => current(key) !== ALL_VALUE);
  const resetHref = (() => {
    if (!filtered) return undefined;
    const keep = new URLSearchParams();
    if (isListingsView(current(VIEW_KEY)))
      keep.set(VIEW_KEY, current(VIEW_KEY));
    if (sale && !action) keep.set(MARKET_KEY, market);
    // The order is not a filter either.
    if (sort !== "sana") keep.set(SORT_KEY, sort);
    if (current(AUCTION_WINDOW_KEY) !== ALL_VALUE)
      keep.set(AUCTION_WINDOW_KEY, current(AUCTION_WINDOW_KEY));
    const qs = keep.toString();
    const path = action ?? `/${locale}`;
    return withBasePath(
      `${path}${qs ? `?${qs}` : ""}${action ? "" : "#obyektlar-xarita"}`,
    );
  })();

  const panel = (
    <>
      {/* sr-only, not deleted: this is the panel's accessible
          name, and the eyebrow style is what the operator asked to drop. */}
      <Eyebrow as="h2" className="sr-only">
        {sale ? tp("filterLabel") : t("label")}
      </Eyebrow>

      {/*
          Still a plain GET form. Submitting reloads with the filters in the
          URL, which is what makes a result set linkable and lets the server
          send only matching records. The `#obyektlar-xarita` fragment drops
          the reader at the explorer rather than back at the top of the page.

          `withBasePath` because a form's `action` is raw HTML — Next rewrites
          `<Link>` hrefs under a basePath, never this. Unprefixed, every search
          would submit to the domain root, which is a different project.
        */}
      <form
        action={withBasePath(action ?? `/${locale}#obyektlar-xarita`)}
        method="get"
        /*
            ONE grid, four field columns wide, so "Savdo kuni" and
            Saralash wrap onto a second row exactly under Hudud and Tuman, and
            the actions take the rest of that row. A separate grid for the
            second row would have sized its columns against a different total
            and left the two rows visibly out of step.

            The homepage variant has no second row, so its button keeps the
            trailing `auto` column beside the four fields.

            Five fields in ONE row was tried and does not fit at any viewport
            width: the container caps at 1200px, so five plus the button is
            191px per field, and "Qoraqalpog'iston Respublikasi" needs 188px of
            text in the 144px box that leaves — clipped mid-word, with
            `text-overflow: clip` not even leaving an ellipsis to signal it.
          */
        className={
          auctionDay
            ? "grid gap-3 md:grid-cols-2 lg:grid-cols-4"
            : "grid gap-3 md:grid-cols-2 lg:grid-cols-[minmax(0,1.2fr)_repeat(3,minmax(0,1fr))_auto]"
        }
      >
        {/*
            Carries the open tab through the submit.

            A GET form sends only its own fields, so without this every search
            dropped `korinish` and the explorer reopened on the map — a reader
            who had switched to the list was thrown back on each search. Both
            values are carried, because which one is the default depends on
            the page — the homepage opens on the map, the catalogue on the
            list — and a URL that says nothing keeps a clean search.
          */}
        {isListingsView(current(VIEW_KEY)) ? (
          <input type="hidden" name={VIEW_KEY} value={current(VIEW_KEY)} />
        ) : null}

        {/*
            The homepage's Ijara | Xususiylashtirish switch, carried through a
            search for the same reason as the tab. Only on the homepage (no
            `action`): /xususiylashtirish IS the sale page and needs no flag.
          */}
        {sale && !action ? (
          <input type="hidden" name={MARKET_KEY} value={market} />
        ) : null}

        {/*
            Hudud + Tuman are one coupled control — picking a region has to
            narrow the district list immediately, so they live in a small
            client island together. See region-district-fields.tsx.

            Tuman occupies the slot "Obyekt turi" used to. The auction service
            returns no property classification, so a type filter could only be
            populated by inferring a type from the lot's name — a guess about a
            specific state asset, which this portal does not make. District is
            the real second axis the data supports.

            `tur` is still honoured by parseListingQuery, so old links keep
            their meaning against the typed fallback records.
          */}
        <RegionDistrictFields
          regions={regions}
          districtsByRegion={districtsByRegion}
          initialRegion={current("hudud")}
          initialDistrict={current("tuman")}
          labels={{
            region: t("region"),
            anyRegion: t("anyRegion"),
            district: t("district"),
            anyDistrict: t("anyDistrict"),
            regionFirst: t("regionFirst"),
          }}
        />

        <SelectField
          id="maydon"
          name="maydon"
          label={t("area")}
          defaultValue={current("maydon")}
          /*
              Edges taken from the live catalogue's quartiles, not round
              numbers. The previous set started at 50 m², which against real
              data made 59% of lots — every kiosk, ATM bay and technical plot,
              780 of 1319 — unreachable by ANY choice in the dropdown. These
              five each hold 6–30% of the catalogue.
            */
          options={[
            { value: ALL_VALUE, label: t("anyArea") },
            ...(sale
              ? SALE_AREA_BANDS
              : [
                  { value: "0-10", label: "0 — 10" },
                  { value: "10-50", label: "10 — 50" },
                  { value: "50-200", label: "50 — 200" },
                  { value: "200-1000", label: "200 — 1000" },
                  { value: "1000-", label: "1000+" },
                ]),
          ]}
        />

        <SelectField
          id="narx"
          name="narx"
          label={sale ? t("startPrice") : t("price")}
          defaultValue={current("narx")}
          /*
              Also from the live quartiles. "10 mln+" used to collect 39% of
              the catalogue in one bucket, across a range running to 2 224 mln
              — too coarse to narrow anything.
            */
          options={[
            { value: ALL_VALUE, label: t("anyPrice") },
            ...(sale
              ? SALE_PRICE_BANDS.map((b) => ({
                  value: b.value,
                  label: t(`saleBands.${b.key}`),
                }))
              : LEASE_PRICE_BANDS.map((b) => ({
                  value: b.value,
                  label: t(`leaseBands.${b.key}`),
                }))),
          ]}
        />

        {/*
            Savdo kuni — the calendar, on its own row.

            Modelled on e-auksion's filter of the same name, so a citizen who
            has used the auction site meets the control they already know. It
            differs in one way that matters: days with no lots cannot be
            picked. See auction-day-field.tsx for why, and for why a calendar
            is a client component when nothing else in this panel is.
          */}
        {auctionDay ? (
          <AuctionDayField
            id="savdo"
            name={AUCTION_DAY_KEY}
            label={td("field")}
            value={
              current(AUCTION_DAY_KEY) === ALL_VALUE
                ? undefined
                : current(AUCTION_DAY_KEY)
            }
            days={auctionDays}
            /* Placed, not auto-flowed: as the fifth child it would otherwise
                 land in the button's column at the end of row one. Column 1 of
                 row 2 puts it under Hudud, with the reserved columns to its
                 right. */
            className="lg:col-start-1 lg:row-start-2"
            labels={dayLabels}
          />
        ) : (
          /*
              Not shown here, but the strip's window is not dropped either.

              A GET form submits only its own fields, so on the homepage —
              where this panel carries no date control — pressing Qidirish
              would silently clear the window a reader had just chosen from the
              chips below. Same fix, and same reason, as the `korinish` input
              above.
            */
          current(AUCTION_WINDOW_KEY) !== ALL_VALUE && (
            <input
              type="hidden"
              name={AUCTION_WINDOW_KEY}
              value={current(AUCTION_WINDOW_KEY)}
            />
          )
        )}

        {/*
            Eʼlon qilingan sana — when the lot was PUBLISHED, beside the day
            its auction runs. The same calendar, greying out every day on
            which nothing still open was published. See getPublishedDays.
          */}
        {published ? (
          <AuctionDayField
            id={PUBLISHED_DAY_KEY}
            name={PUBLISHED_DAY_KEY}
            label={t("publishedDate")}
            value={
              current(PUBLISHED_DAY_KEY) === ALL_VALUE
                ? undefined
                : current(PUBLISHED_DAY_KEY)
            }
            days={publishedDays}
            className="lg:col-start-2 lg:row-start-2"
            labels={dayLabels}
          />
        ) : null}

        {/*
            Saralash — the first of the second-row columns that were held
            for "the next filters". With the calendar only: that is the
            catalogue variant, the one with a list long enough to order. On
            the homepage the order is carried rather than offered, like the
            open tab, so a search from there does not reset it.
          */}
        {auctionDay ? (
          <SelectField
            id={SORT_KEY}
            name={SORT_KEY}
            label={t("sort")}
            defaultValue={sort}
            className={
              published
                ? "lg:col-start-3 lg:row-start-2"
                : "lg:col-start-2 lg:row-start-2"
            }
            options={LISTINGS_SORTS.map((value) => ({
              value,
              label: t(`sorts.${value}`),
            }))}
          />
        ) : sort !== "sana" ? (
          <input type="hidden" name={SORT_KEY} value={sort} />
        ) : null}

        {/* With the calendar: columns 3-4 of the second row, right-aligned,
              so the four fields above run the full width whatever is here.
              It used to sit in a fifth `auto` column, which Tozalash widened
              — shrinking every field in row one whenever a filter was set.
              Without it (the homepage) the trailing column stays, held at
              one width by `compact`. */}
        <FilterActions
          resetHref={resetHref}
          compact={!auctionDay}
          className={
            published
              ? "md:col-span-2 md:justify-end lg:col-span-1 lg:col-start-4 lg:row-start-2"
              : auctionDay
                ? "md:col-span-2 md:justify-end lg:col-start-3 lg:row-start-2"
                : undefined
          }
        />
      </form>
    </>
  );

  /*
    Nested: no section, no surface of its own — just spacing off the stat
    cards above it. The `<Hero>` supplies the `<section>`, the tone and the
    background, so adding any here would put a second surface back on top of
    the one this variant exists to avoid.
  */
  if (nested) return <div className="mt-12">{panel}</div>;

  return (
    <FilterBand
      id={sale ? "filter-sale" : "filter-lease"}
      activeCount={
        FILTER_KEYS.filter((key) => current(key) !== ALL_VALUE).length
      }
    >
      {panel}
    </FilterBand>
  );
}
