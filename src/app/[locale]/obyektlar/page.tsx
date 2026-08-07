import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { Link } from "@/i18n/navigation";
import {
  getListings,
  isEmptyQuery,
  parseListingQuery,
  parsePage,
  summariseByRegion,
} from "@/lib/data/listings";
import { Section } from "@/components/layout/section";
import { SearchWidget } from "@/components/sections/search-widget";
import { ObjectsExplorer } from "@/components/sections/objects-explorer";

export const metadata: Metadata = {
  title: "Ijara obyektlari",
  description:
    "Bo'sh davlat mulki obyektlarini hudud, tur, maydon va narx bo'yicha qidiring — xarita va hududlar kesimida.",
};

/**
 * Full catalogue: the same explorer as the homepage, with the search panel
 * bound to this route so filtering happens in place.
 */
export default async function ObjectsPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const sp = await searchParams;
  const query = parseListingQuery(sp);
  const page = parsePage(sp);
  const { listings, hasMock } = await getListings(query);
  const summaries = summariseByRegion(listings);

  /*
    Active filters, serialised for the pager. Passed as a STRING rather than a
    link-building function: functions cannot cross the server/client boundary,
    and doing so threw "Functions cannot be passed directly to Client
    Components" — a 500 on every request here.
  */
  const filterParams = new URLSearchParams();
  for (const key of ["hudud", "tur", "maydon", "narx"] as const) {
    const raw = sp[key];
    const value = Array.isArray(raw) ? raw[0] : raw;
    if (value && value !== "all") filterParams.set(key, value);
  }

  return (
    <>
      <Section tone="deep" className="pb-8">
        <nav aria-label="Breadcrumb" className="mb-6">
          <ol className="text-muted-foreground flex items-center gap-2 text-sm">
            <li>
              <Link
                href="/"
                className="hover:text-accent-foreground transition-colors"
              >
                Bosh sahifa
              </Link>
            </li>
            <li aria-hidden="true">/</li>
            <li className="text-foreground">Ijara obyektlari</li>
          </ol>
        </nav>

        <h1
          data-enter
          className="font-heading max-w-3xl text-3xl font-semibold text-balance sm:text-4xl lg:text-5xl"
        >
          Ijara obyektlari
        </h1>
        <p
          data-enter
          style={{ "--enter-delay": 1 } as React.CSSProperties}
          className="text-muted-foreground mt-4 max-w-2xl text-pretty"
        >
          {isEmptyQuery(query)
            ? "Barcha bo'sh davlat mulki obyektlari xaritada va hududlar kesimida. Quyidagi paneldan saralang."
            : "Tanlangan shartlar bo'yicha natijalar. Filtrni o'zgartirish uchun quyidagi paneldan foydalaning."}
        </p>
      </Section>

      {/* Submits to this page, so the results below update in place. */}
      <SearchWidget action={`/${locale}/obyektlar`} values={sp} />

      <Section tone="deep">
        <ObjectsExplorer
          listings={listings}
          summaries={summaries}
          hasMock={hasMock}
          // The catalogue always lists lots; region totals are a homepage
          // overview device, not what someone opening /obyektlar wants.
          showLots
          page={page}
          // 12 per page: four rows of three at the widest grid, which is about
          // as much as scans comfortably before the pager is wanted.
          perPage={12}
          filterQuery={filterParams.toString()}
          basePath="/obyektlar"
          emptyLabel="Tanlangan shartlarga mos obyekt topilmadi. Filtrni kengaytirib ko'ring."
        />
      </Section>
    </>
  );
}
