import { Search } from "lucide-react";
import { getLocale, getTranslations } from "next-intl/server";

import { withBasePath } from "@/lib/base-path";
import { getRegionOptions } from "@/lib/data/catalog";
import {
  AUCTION_DAY_KEY,
  AUCTION_WINDOW_KEY,
  getAuctionDays,
  getDistrictsByRegion,
  parseListingQuery,
  VIEW_KEY,
} from "@/lib/data/listings";
import { RegionDistrictFields } from "./region-district-fields";
import { AuctionDayField } from "@/components/common/auction-day-field";
import { Eyebrow } from "@/components/common/eyebrow";
import { ALL_VALUE, SelectField } from "@/components/common/select-field";
import { Container } from "@/components/layout/section";

/**
 * Object search.
 *
 * The legacy version was four bare `<select>` elements — not wrapped in a
 * form — beside a button with no handler. Nothing was submittable.
 *
 * This is a real GET form targeting /obyektlar, so results stay addressable
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
   * of navigating away. /obyektlar passes its own path to filter in place.
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
   * /obyektlar turns it on.
   */
  auctionDay = false,
}: {
  action?: string;
  values?: Record<string, string | string[] | undefined>;
  auctionDay?: boolean;
} = {}) {
  const t = await getTranslations("search");
  const td = await getTranslations("auctionDay");
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
  const districtsByRegion = await getDistrictsByRegion();

  /*
    The days the calendar may offer, scoped to the rest of the active search —
    so filtering to one tuman greys out every day that tuman has no auction on.
    Only fetched for the variant that renders the calendar; the homepage panel
    pays nothing for a control it does not show.
  */
  const auctionDays = auctionDay
    ? await getAuctionDays(parseListingQuery(values ?? {}))
    : [];

  /*
    `bg-band` + `border-hairline`, not `bg-navy-mid` + `border-border`: raw
    brand values do not flip in accessibility mode, so this panel used to stay
    navy — with a near-invisible edge — while the rest of the page went black.
    Same fix as the header's utility strip.
  */
  return (
    <section data-tone="deep" className="bg-band border-hairline border-y">
      <Container className="py-16">
        <Eyebrow as="h2" className="mb-4">
          {t("label")}
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
            ONE grid, four field columns wide, in both variants — so the
            top row is byte-for-byte the layout it has always been and "Savdo
            kuni" simply wraps onto a second row beneath Hudud.

            That leaves columns 2-4 of the second row empty, and they are meant
            to be: the next filters go there, at exactly the width of the ones
            above them. A separate grid for the second row would have sized its
            columns against a different total and left the two rows visibly out
            of step.

            Five fields in ONE row was tried and does not fit at any viewport
            width: the container caps at 1200px, so five plus the button is
            191px per field, and "Qoraqalpog'iston Respublikasi" needs 188px of
            text in the 144px box that leaves — clipped mid-word, with
            `text-overflow: clip` not even leaving an ellipsis to signal it.
          */
          className="grid gap-3 md:grid-cols-2 lg:grid-cols-[repeat(4,1fr)_auto]"
        >
          {/*
            Carries the open tab through the submit.

            A GET form sends only its own fields, so without this every search
            dropped `korinish` and the explorer reopened on the map — a reader
            who had switched to the list was thrown back on each search. Only
            rendered for the non-default view, so a plain map search keeps a
            clean URL.
          */}
          {current(VIEW_KEY) === "royxat" ? (
            <input type="hidden" name={VIEW_KEY} value="royxat" />
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
              { value: "0-10", label: "0 — 10" },
              { value: "10-50", label: "10 — 50" },
              { value: "50-200", label: "50 — 200" },
              { value: "200-1000", label: "200 — 1000" },
              { value: "1000-", label: "1000+" },
            ]}
          />

          <SelectField
            id="narx"
            name="narx"
            label={t("price")}
            defaultValue={current("narx")}
            /*
              Also from the live quartiles. "10 mln+" used to collect 39% of
              the catalogue in one bucket, across a range running to 2 224 mln
              — too coarse to narrow anything.
            */
            options={[
              { value: ALL_VALUE, label: t("anyPrice") },
              { value: "0-1", label: "0 — 1 mln" },
              { value: "1-5", label: "1 — 5 mln" },
              { value: "5-20", label: "5 — 20 mln" },
              { value: "20-100", label: "20 — 100 mln" },
              { value: "100-", label: "100 mln+" },
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
              labels={{
                placeholder: td("placeholder"),
                clear: td("clear"),
                months: td.raw("months") as string[],
                weekdays: td.raw("weekdays") as string[],
                // `raw`, not `td("lots")`: the {count} is substituted in the
                // browser once a day is known, so ICU must not try to resolve
                // it here — there is no value to give it yet.
                lots: td.raw("lots") as string,
              }}
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

          {/* Pinned to the last column, and to the second ROW when the
              calendar is there — otherwise it would follow "Savdo kuni"
              straight into column 2 and sit in the middle of the space the
              next filters are reserved for. */}
          <div
            className={
              auctionDay
                ? "flex items-end lg:col-start-5 lg:row-start-2"
                : "flex items-end"
            }
          >
            <button
              type="submit"
              /* `active:scale` because the transition already declared
                 `transform` but nothing ever changed it — the button animated
                 opacity only and felt inert on press. */
              className="focus-visible:ring-ring group inline-flex h-11 w-full items-center justify-center gap-2 rounded-md bg-[color:var(--color-cobalt)] px-6 text-sm font-semibold text-[color:var(--color-mist-pale)] transition-[opacity,transform] duration-200 ease-out hover:opacity-90 focus-visible:ring-2 focus-visible:ring-offset-2 active:scale-[0.98] lg:w-auto"
            >
              <Search
                aria-hidden="true"
                className="size-4 transition-transform duration-200 group-hover:scale-110"
              />
              {t("submit")}
            </button>
          </div>
        </form>
      </Container>
    </section>
  );
}
