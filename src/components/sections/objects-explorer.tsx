"use client";

import { useCallback, useMemo } from "react";
import dynamic from "next/dynamic";
import { useLocale, useTranslations } from "next-intl";
import {
  Building2,
  ChevronLeft,
  ChevronRight,
  LayoutList,
  MapPin,
  TriangleAlert,
} from "lucide-react";

import { useSearchParams } from "next/navigation";

import { Link, usePathname, useRouter } from "@/i18n/navigation";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LotCard } from "@/components/common/lot-card";
import { StaleNotice } from "@/components/common/stale-notice";
import { formatArea, formatNumber, formatSom } from "@/lib/format";
// From lib/listings-view, NOT lib/data/listings — the latter is `server-only`
// and importing it here pulls the API credentials into the browser bundle.
import { VIEW_KEY, type ListingsView } from "@/lib/listings-view";
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
        {/* Literal: this runs before the component that owns the
            translations mounts. See MAP_LOADING below. */}
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
  const t = useTranslations("objects");

  return (
    <li data-reveal="left">
      <Link
        href={`/ijaraga-obyektlar?hudud=${summary.slug}`}
        className="group hover:bg-secondary/60 focus-visible:ring-ring flex flex-col gap-3 px-4 py-3.5 transition-colors duration-200 focus-visible:ring-2 focus-visible:-outline-offset-2 focus-visible:outline-none sm:flex-row sm:items-center sm:gap-6"
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
            <dt className="text-muted-foreground text-xs">{t("count")}</dt>
            <dd className="mt-0.5 text-sm font-medium">
              {formatNumber(summary.count)} ta
            </dd>
          </div>
          <div className="sm:w-28 sm:text-right">
            <dt className="text-muted-foreground text-xs">{t("totalArea")}</dt>
            <dd className="mt-0.5 text-sm font-medium">
              {formatArea(summary.totalArea)}
            </dd>
          </div>
          <div className="sm:w-36 sm:text-right">
            <dt className="text-muted-foreground text-xs">
              {t("averagePrice")}
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
  const t = useTranslations("objects");

  // A compact window around the current page — a 60-page catalogue must not
  // render 60 links.
  const pages: (number | "gap")[] = [];
  const push = (n: number) => pages.push(n);

  push(1);
  if (page > 3) pages.push("gap");
  for (
    let n = Math.max(2, page - 1);
    n <= Math.min(totalPages - 1, page + 1);
    n++
  ) {
    push(n);
  }
  if (page < totalPages - 2) pages.push("gap");
  if (totalPages > 1) push(totalPages);

  const linkClass =
    "border-border hover:border-ring/50 hover:text-accent-foreground inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2.5 text-sm transition-colors duration-200";

  return (
    <nav aria-label={t("pagination")} className="mt-8 flex justify-center">
      <ul className="flex flex-wrap items-center gap-1.5">
        <li>
          {page > 1 ? (
            <Link
              href={hrefFor(page - 1)}
              rel="prev"
              aria-label={t("prevPage")}
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
              aria-label={t("nextPage")}
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
  asOf,
  showLots,
  page = 1,
  perPage,
  moreHref,
  emptyLabel = "Tanlangan shartlarga mos obyekt topilmadi.",
  filterQuery,
  basePath,
  view = "xarita",
}: {
  listings: Listing[];
  summaries: RegionSummary[];
  hasMock: boolean;
  /**
   * Set when the feed was unreachable and these are its last real lots. Real
   * records, so no mock warning — but dated, so the reader knows the auction
   * dates on them may already have passed. See lib/data/snapshot.ts.
   */
  asOf?: string;
  /**
   * Which tab is open, read from the URL by the page. Not internal state:
   * a search is a full navigation, so a tab held in React would reset on
   * every submit. See VIEW_KEY in lib/data/listings.ts.
   */
  view?: ListingsView;
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
  const t = useTranslations("objects");
  const locale = useLocale();
  const router = useRouter();
  const pathname = usePathname();
  /*
    `useSearchParams` from next/navigation, not from @/i18n/navigation — that
    module wraps only the locale-aware pieces (Link, usePathname, useRouter)
    and does not re-export this one. Query strings carry no locale prefix, so
    there is nothing for it to wrap.
  */
  const searchParams = useSearchParams();

  const regionName = useCallback(
    (slug: string) => summaries.find((s) => s.slug === slug)?.name ?? slug,
    [summaries],
  );

  const detailHref = useCallback(
    (listing: Listing) =>
      listing.auctionUrl ?? `/${locale}/ijaraga-obyektlar/${listing.id}`,
    [locale],
  );

  const mapLabels = useMemo(
    () => ({
      mock: "Namunaviy yozuv",
      details: "E-auksionda ko'rish",
      lot: "Lot №",
      zoomHint: "Kattalashtirish uchun Ctrl + Scroll",
      // Same wording as LotCard's countdown, so a pin's popup and a card read
      // as the same feature rather than two different ones.
      auctionCountdown: "Savdo boshlanishiga",
      auctionStarted: "Savdo boshlandi",
      fullscreenEnter: "Butun ekranga ochish",
      fullscreenExit: "Butun ekrandan chiqish",
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
      {/*
        The feed was down and these are its last real lots. Mutually exclusive
        with the mock notice below — a snapshot never contains generated
        records, so the two can never both apply.
      */}
      {asOf ? <StaleNotice asOf={asOf} className="mb-5" /> : null}

      {hasMock ? (
        <p className="border-outline text-muted-foreground mb-5 flex items-start gap-2.5 rounded-lg border border-dashed p-3 text-xs">
          <TriangleAlert
            aria-hidden="true"
            className="text-accent-foreground mt-0.5 size-4 shrink-0"
          />
          <span>
            {"Ko'rsatilayotgan obyektlar hozircha "}
            <strong>{"namunaviy"}</strong>
            {
              " — ular tizim ishini ko'rsatish uchun yaratilgan va haqiqiy davlat mulki emas. Rasmiy ma'lumot uchun "
            }
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

      {/*
        Controlled from the URL, not `defaultValue`.

        The search panel is a real GET form, so every search is a full
        navigation and an uncontrolled Tabs remounted at its default — a reader
        who had switched to the list was thrown back to the map on each search,
        and on each page of the pager. `router.replace` writes the tab back so
        the next navigation carries it; `scroll: false` keeps the page from
        jumping to the top on a tab click.
      */}
      <Tabs
        value={view}
        onValueChange={(next) => {
          const params = new URLSearchParams(searchParams?.toString() ?? "");
          if (next === "royxat") params.set(VIEW_KEY, "royxat");
          else params.delete(VIEW_KEY);
          const qs = params.toString();
          router.replace(qs ? `${pathname}?${qs}` : pathname, {
            scroll: false,
          });
        }}
      >
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <TabsList>
            <TabsTrigger value="xarita" className="gap-1.5">
              <MapPin aria-hidden="true" className="size-4" />
              {t("mapTab")}
            </TabsTrigger>
            <TabsTrigger value="royxat" className="gap-1.5">
              <LayoutList aria-hidden="true" className="size-4" />
              {showLots ? t("count") : t("regionsTab")}
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="xarita" className="mt-0">
          {/*
            `isolate` is load-bearing, not tidiness.

            Leaflet stacks its own chrome high inside the map: panes at
            z-index 700, controls at 800, the corner containers at 1000. None
            of this wrapper's ancestors created a stacking context, so those
            numbers were competing directly with the rest of the page — and the
            sticky site header is only `z-40`. Scrolling the map under it, the
            map won and painted straight over the navigation.

            `isolation: isolate` makes this element a stacking context, so
            Leaflet's 700/800/1000 are resolved WITHIN the map and the map as a
            whole then sits below the header like any other content. Raising
            the header's z-index instead would have been a race we would keep
            re-running every time a plugin picked a bigger number.
          */}
          {/* rounded-md (14px), not rounded-xl (28px) — the scale here is
              custom, so `xl` is nearly twice the usual Tailwind value and
              read as over-rounded on a box this large. */}
          <div className="border-border relative isolate h-[26rem] overflow-hidden rounded-md border sm:h-[32rem]">
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
                  <LotCard
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
                    Yana {formatNumber(listings.length - pagedListings.length)}{" "}
                    ta obyekt — barchasini ko&apos;rish
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
