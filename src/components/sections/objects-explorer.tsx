"use client";

import { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useLocale } from "next-intl";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  MapPin,
  TriangleAlert,
} from "lucide-react";

import { Link } from "@/i18n/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { SurfaceCard } from "@/components/common/surface-card";
import { ImagePlaceholder } from "@/components/common/placeholder/image-placeholder";
import { formatArea, formatDate, formatNumber, formatSom } from "@/lib/format";
import type { Listing, RegionSummary } from "@/types/content";

/*
  Map / list explorer.

  Two views over the SAME filtered set, so the tabs can never disagree:

    Xarita   every matching lot as a clustered pin
    Ro'yxat  region totals when nothing is filtered, individual lots once a
             search is running

  That second behaviour is the point: with no query the useful answer is
  "where is there anything at all", which is a per-region count. Once someone
  has actually searched, they want the lots themselves.

  Both views are driven by the search panel through
  `?hudud=&tur=&maydon=&narx=`, which the server reads and filters on — one
  source of truth (the URL), so a result set is linkable and the browser is
  sent only matching records.
*/

const ListingsMap = dynamic(
  () => import("@/components/map/listings-map").then((m) => m.ListingsMap),
  {
    ssr: false,
    loading: () => (
      <div className="bg-secondary text-muted-foreground flex h-full w-full items-center justify-center text-sm">
        Xarita yuklanmoqda…
      </div>
    ),
  },
);

const TYPE_LABELS: Record<string, string> = {
  noturar: "Noturar joy",
  turar: "Turar joy",
  "ishlab-chiqarish": "Ishlab chiqarish",
  mamuriy: "Ma'muriy bino",
};

/* ── Region total ─────────────────────────────────────────────────────── */

/*
  Region totals are a LIST, not a grid of cards.

  A card implies a thing you look at; these are four numbers per region whose
  whole purpose is to be compared down the column — "where is there most
  space, and where is it cheapest". Cards scatter those figures across a grid
  so no two are ever vertically aligned, and they carry an image well that has
  no image to put in it. Fixed-width, right-aligned metric columns line the
  numbers up, which is what makes the set scannable.
*/
function RegionRow({ summary }: { summary: RegionSummary }) {
  return (
    <li data-reveal="left">
      <Link
        href={`/obyektlar?hudud=${summary.slug}`}
        className="group hover:bg-secondary/60 focus-visible:ring-ring flex flex-col gap-3 px-4 py-3.5 transition-colors duration-200 focus-visible:ring-2 focus-visible:outline-none focus-visible:-outline-offset-2 sm:flex-row sm:items-center sm:gap-6"
      >
        <div className="flex min-w-0 flex-1 items-start gap-2.5">
          <MapPin
            aria-hidden="true"
            className="text-accent-foreground mt-0.5 size-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5"
          />
          <div className="min-w-0">
            <h3 className="group-hover:text-accent-foreground truncate text-base font-semibold transition-colors duration-200">
              {summary.name}
            </h3>
            {/* `topType` needs a source that classifies lots; the live service
                does not, so districts stand in. Both are derived from the
                matching set — neither is ever typed into markup. */}
            {summary.topType ? (
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                Asosan: {TYPE_LABELS[summary.topType] ?? summary.topType}
              </p>
            ) : summary.districtCount ? (
              <p className="text-muted-foreground mt-0.5 truncate text-xs">
                {formatNumber(summary.districtCount)} ta tuman va shaharda
              </p>
            ) : null}
          </div>
        </div>

        {/* Indented to the heading below sm, where the row stacks. */}
        <dl className="flex shrink-0 items-baseline gap-5 pl-[1.625rem] sm:gap-8 sm:pl-0">
          <div className="sm:w-20 sm:text-right">
            <dt className="text-muted-foreground text-xs">Obyektlar</dt>
            <dd className="mt-0.5 text-sm font-medium">
              {formatNumber(summary.count)} ta
            </dd>
          </div>
          <div className="sm:w-28 sm:text-right">
            <dt className="text-muted-foreground text-xs">Umumiy maydon</dt>
            <dd className="mt-0.5 text-sm font-medium">
              {formatArea(summary.totalArea)}
            </dd>
          </div>
          <div className="sm:w-36 sm:text-right">
            <dt className="text-muted-foreground text-xs">
              O&apos;rtacha narx
            </dt>
            <dd className="text-accent-foreground mt-0.5 text-sm font-semibold">
              {formatSom(summary.avgPrice)}
            </dd>
          </div>
        </dl>

        <ChevronRight
          aria-hidden="true"
          className="text-muted-foreground group-hover:text-accent-foreground hidden size-4 shrink-0 transition-all duration-200 group-hover:translate-x-0.5 sm:block"
        />
      </Link>
    </li>
  );
}

/* ── Individual lot ───────────────────────────────────────────────────── */

function ListingCard({
  listing,
  regionName,
}: {
  listing: Listing;
  regionName: string;
}) {
  return (
    <SurfaceCard
      as="li"
      radius="md"
      padding="none"
      interactive
      data-reveal="up"
      className="group overflow-hidden"
    >
      <a
        href={listing.auctionUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex h-full flex-col"
      >
        {/* `data-clip` — wipes up from its own bottom edge as the card
            arrives, which reads as the image being uncovered rather than
            switched on. */}
        <div data-clip className="relative aspect-[16/9] overflow-hidden">
          {/*
            A photo only when upstream actually supplies one for THIS lot —
            otherwise the placeholder. Never a stock image: on a state portal a
            photograph on a lot card reads as a photograph of that lot.

            Plain <img>, not next/image: these are remote files on a host we do
            not control, and optimising them would proxy every one through our
            own server for no gain. `loading="lazy"` keeps them off the
            critical path.
          */}
          {listing.image ? (
            // eslint-disable-next-line @next/next/no-img-element -- remote lot photo on a host we do not control; see above.
            <img
              src={listing.image}
              alt=""
              loading="lazy"
              decoding="async"
              className="h-full w-full object-cover"
            />
          ) : (
            <ImagePlaceholder />
          )}
          {listing.isMock ? (
            <span className="bg-[color:var(--color-navy)]/85 text-[color:var(--color-gold-light)] absolute top-2.5 right-2.5 rounded-full px-2.5 py-0.5 text-xs backdrop-blur-sm">
              Namunaviy
            </span>
          ) : null}
        </div>

        {/*
          Type scale matches featured-listings.tsx exactly — title 1rem, meta
          .875rem, price 1.25rem, captions .75rem, p-5. Both components render
          the same thing (a rental lot as a card), and this one used to sit a
          whole step below it, so the two card grids on the homepage read as
          different systems.
        */}
        <div className="flex flex-1 flex-col p-5">
          <h3 className="group-hover:text-accent-foreground text-base leading-snug font-semibold text-balance transition-colors duration-200">
            {listing.title}
          </h3>

          <p className="text-muted-foreground mt-2 text-sm">
            {listing.district ? `${listing.district} · ` : ""}
            {regionName} · {formatArea(listing.area)}
            {listing.lotNumber ? ` · Lot №${listing.lotNumber}` : ""}
          </p>

          {/*
            No lot status on the card. It is still read in the data layer —
            `isOpenForApplications` drops concluded lots before they ever reach
            here — so every card on screen is open for applications and saying
            so on each one adds nothing.

            Label above value on both sides, so the two read as a matched pair.
            "so'm" stays on the number because `formatSom` returns "1,1 mln"
            with no currency of its own; without it the card would show a sum
            of money with no unit.
          */}
          {/* `mt-auto`, not featured-listings' `mt-5`: lot titles here run to
              three lines, and mt-auto pins the price row to the bottom so it
              lines up across a row of cards. The type scale is shared; this one
              spacing rule is not. */}
          <div className="border-border mt-auto flex items-end justify-between gap-3 border-t pt-4">
            <span>
              <span className="text-muted-foreground block text-xs">
                Boshlang&apos;ich narx
              </span>
              <span className="font-heading text-accent-foreground block text-xl font-semibold">
                {formatSom(listing.pricePerYear)} so&apos;m
              </span>
            </span>

            {listing.auctionDate ? (
              <span className="shrink-0 text-right">
                <span className="text-muted-foreground block text-xs">
                  Savdo kuni
                </span>
                <span className="block text-sm font-medium">
                  {formatDate(listing.auctionDate)}
                </span>
              </span>
            ) : listing.type ? (
              <span className="text-muted-foreground shrink-0 text-right text-xs">
                {TYPE_LABELS[listing.type]}
              </span>
            ) : null}
          </div>
        </div>
      </a>
    </SurfaceCard>
  );
}

/* ── Pagination ───────────────────────────────────────────────────────── */

function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  // A compact window around the current page — a 60-page catalogue must not
  // render 60 links.
  const pages: (number | "gap")[] = [];
  const push = (n: number) => pages.push(n);

  push(1);
  if (page > 3) pages.push("gap");
  for (let n = Math.max(2, page - 1); n <= Math.min(totalPages - 1, page + 1); n++) {
    push(n);
  }
  if (page < totalPages - 2) pages.push("gap");
  if (totalPages > 1) push(totalPages);

  const linkClass =
    "border-border hover:border-ring/50 hover:text-accent-foreground inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2.5 text-sm transition-colors duration-200";

  return (
    <nav aria-label="Sahifalar" className="mt-8 flex justify-center">
      <ul className="flex flex-wrap items-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              rel="prev"
              aria-label="Oldingi sahifa"
              className={linkClass}
            >
              <ChevronLeft aria-hidden="true" className="size-4" />
            </Link>
          ) : (
            <span
              aria-hidden="true"
              className={`${linkClass} pointer-events-none opacity-40`}
            >
              <ChevronLeft className="size-4" />
            </span>
          )}
        </li>

        {pages.map((p, i) =>
          p === "gap" ? (
            <li
              key={`gap-${i}`}
              aria-hidden="true"
              className="text-muted-foreground px-1 text-sm"
            >
              …
            </li>
          ) : (
            <li key={p}>
              <Link
                href={hrefFor(p)}
                aria-label={`${p}-sahifa`}
                aria-current={p === page ? "page" : undefined}
                className={
                  p === page
                    ? `${linkClass} border-outline bg-accent text-accent-foreground font-semibold`
                    : linkClass
                }
              >
                {p}
              </Link>
            </li>
          ),
        )}

        <li>
          {page < totalPages ? (
            <Link
              href={hrefFor(page + 1)}
              rel="next"
              aria-label="Keyingi sahifa"
              className={linkClass}
            >
              <ChevronRight aria-hidden="true" className="size-4" />
            </Link>
          ) : (
            <span
              aria-hidden="true"
              className={`${linkClass} pointer-events-none opacity-40`}
            >
              <ChevronRight className="size-4" />
            </span>
          )}
        </li>
      </ul>
    </nav>
  );
}

/* ── Explorer ─────────────────────────────────────────────────────────── */

export function ObjectsExplorer({
  listings,
  summaries,
  hasMock,
  showLots,
  page = 1,
  perPage,
  moreHref,
  emptyLabel = "Tanlangan shartlarga mos obyekt topilmadi.",
  filterQuery,
  basePath,
}: {
  listings: Listing[];
  summaries: RegionSummary[];
  hasMock: boolean;
  /**
   * What the Ro'yxat tab lists. The homepage shows region totals until a
   * search narrows things down; the full catalogue always lists lots.
   */
  showLots: boolean;
  page?: number;
  /** Lots per page. Omit to show every lot. */
  perPage?: number;
  /** Homepage: link on to the full catalogue instead of paginating. */
  moreHref?: string;
  emptyLabel?: string;
  /**
   * Active filters as a query string ("hudud=samarqand&tur=noturar"), used to
   * build page links. A string, not a builder function: functions cannot
   * cross the server/client boundary, and passing one here threw
   * "Functions cannot be passed directly to Client Components" — a 500 on
   * every request to this page.
   */
  filterQuery?: string;
  /** Route the pager links at, e.g. "/obyektlar". */
  basePath?: string;
}) {
  const locale = useLocale();

  const regionName = useCallback(
    (slug: string) => summaries.find((s) => s.slug === slug)?.name ?? slug,
    [summaries],
  );

  const detailHref = useCallback(
    (listing: Listing) =>
      listing.auctionUrl ?? `/${locale}/obyektlar/${listing.id}`,
    [locale],
  );

  const mapLabels = useMemo(
    () => ({
      mock: "Namunaviy yozuv",
      details: "E-auksionda ko'rish",
      lot: "Lot №",
      zoomHint: "Kattalashtirish uchun Ctrl + g'ildirak",
    }),
    [],
  );

  const totalPages = perPage
    ? Math.max(1, Math.ceil(listings.length / perPage))
    : 1;
  const currentPage = Math.min(Math.max(1, page), totalPages);
  const pagedListings = perPage
    ? listings.slice((currentPage - 1) * perPage, currentPage * perPage)
    : listings;

  return (
    <div>
      {/*
        Mock notice. Required whenever generated records are on screen — a
        citizen must never take a sample lot for a real state asset.
      */}
      {hasMock ? (
        <p className="border-outline text-muted-foreground mb-5 flex items-start gap-2.5 rounded-lg border border-dashed p-3 text-xs">
          <TriangleAlert
            aria-hidden="true"
            className="text-accent-foreground mt-0.5 size-4 shrink-0"
          />
          <span>
            {"Ko'rsatilayotgan obyektlar hozircha "}
            <strong>{"namunaviy"}</strong>
            {" — ular tizim ishini ko'rsatish uchun yaratilgan va haqiqiy davlat mulki emas. Rasmiy ma'lumot uchun "}
            <a
              href="https://e-auksion.uz"
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-foreground underline"
            >
              e-auksion.uz
            </a>
            {" saytiga murojaat qiling."}
          </span>
        </p>
      ) : null}

      <Tabs defaultValue="xarita">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="xarita" className="gap-1.5">
              <MapPin aria-hidden="true" className="size-4" />
              Xarita
            </TabsTrigger>
            <TabsTrigger value="royxat" className="gap-1.5">
              <LayoutList aria-hidden="true" className="size-4" />
              {showLots ? "Obyektlar" : "Hududlar"}
            </TabsTrigger>
          </TabsList>

          {/* aria-live so a filter change is announced, not merely seen. */}
          <p aria-live="polite" className="text-muted-foreground text-sm">
            {formatNumber(listings.length)} ta obyekt
            {summaries.length > 0 ? ` · ${summaries.length} ta hududda` : ""}
          </p>
        </div>

        <TabsContent value="xarita" className="mt-0">
          <div className="border-border relative h-[26rem] overflow-hidden rounded-xl border sm:h-[32rem]">
            {listings.length === 0 ? (
              <div className="text-muted-foreground flex h-full items-center justify-center gap-2 text-sm">
                <Building2 aria-hidden="true" className="size-4" />
                {emptyLabel}
              </div>
            ) : (
              <ListingsMap
                listings={listings}
                regionName={regionName}
                detailHref={detailHref}
                labels={mapLabels}
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="royxat" className="mt-0">
          {listings.length === 0 ? (
            <p className="border-border text-muted-foreground rounded-lg border border-dashed py-12 text-center text-sm">
              {emptyLabel}
            </p>
          ) : showLots ? (
            <>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {pagedListings.map((listing) => (
                  <ListingCard
                    key={listing.id}
                    listing={listing}
                    regionName={regionName(listing.region)}
                  />
                ))}
              </ul>

              {/* Homepage caps the list and hands off; the catalogue paginates. */}
              {moreHref && listings.length > pagedListings.length ? (
                <p className="mt-6 text-center">
                  <Link
                    href={moreHref}
                    className="border-outline text-accent-foreground hover:bg-accent inline-flex items-center gap-2 rounded-md border px-4 py-2 text-sm font-medium transition-colors duration-200"
                  >
                    Yana{" "}
                    {formatNumber(listings.length - pagedListings.length)} ta
                    obyekt — barchasini ko&apos;rish
                    <ChevronRight aria-hidden="true" className="size-4" />
                  </Link>
                </p>
              ) : null}

              {!moreHref && basePath && totalPages > 1 ? (
                <Pagination
                  page={currentPage}
                  totalPages={totalPages}
                  hrefFor={(n) => {
                    const params = new URLSearchParams(filterQuery ?? "");
                    if (n > 1) params.set("sahifa", String(n));
                    const qs = params.toString();
                    return qs ? `${basePath}?${qs}` : basePath;
                  }}
                />
              ) : null}
            </>
          ) : (
            <ul className="border-border divide-border divide-y overflow-hidden rounded-xl border">
              {summaries.map((summary) => (
                <RegionRow key={summary.slug} summary={summary} />
              ))}
            </ul>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
