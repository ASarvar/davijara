import { MapPin } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getRegions } from "@/lib/data/catalog";
import { SurfaceCard } from "@/components/common/surface-card";
import { Section, SectionHeader } from "@/components/layout/section";
import { formatNumber } from "@/lib/format";

/**
 * Region selector — the replacement for the legacy Leaflet map.
 *
 * Three problems with what was here before:
 *
 *  1. It pulled tiles from `{s}.google.com/vt/...`, scraping Google Maps
 *     outside its terms of service.
 *  2. `getRandomViloyatlar(viloyatlar, 7)` shuffled the region list and drew
 *     7 of 13 markers, so which regions appeared changed on every refresh.
 *  3. Every marker called `.openPopup()` in a loop, so only the last one
 *     stayed open — the rest silently closed.
 *
 * It is replaced with a region index rather than another tile map, because a
 * tile map is the wrong tool for choosing between 14 fixed administrative
 * regions: it costs a JS bundle and a network waterfall to render data that
 * never moves, and it is difficult to use with a keyboard or screen reader.
 * This ships no JavaScript, paints immediately, and every region is a real
 * link into its filtered listings.
 *
 * Note on the deliberate absence of a drawn map: accurate boundary geometry
 * for Uzbekistan's regions is not something to approximate by hand. A real
 * geographic map belongs on /obyektlar/xarita, built from a proper GeoJSON
 * source with an openly-licensed tile provider.
 */
export async function RegionGrid() {
  const t = await getTranslations("map");
  const regions = await getRegions();

  return (
    <Section tone="deep">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        description={t("description")}
      />

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
        {regions.map((region) => (
          <SurfaceCard
            as="li"
            key={region.slug}
            radius="md"
            padding="none"
            interactive
            data-reveal="up"
          >
            <Link
              href={`/obyektlar?hudud=${region.slug}`}
              className="group flex h-full items-start gap-3 p-4"
            >
              <MapPin
                aria-hidden="true"
                className="text-accent-foreground mt-0.5 size-4 shrink-0 transition-transform duration-200 group-hover:-translate-y-0.5"
              />
              <span className="min-w-0">
                <span className="group-hover:text-accent-foreground block text-sm font-medium transition-colors duration-200">
                  {region.name}
                </span>
                <span className="text-muted-foreground mt-0.5 block text-xs">
                  {t("objectsCount", {
                    count: formatNumber(region.objectCount),
                  })}
                </span>
              </span>
            </Link>
          </SurfaceCard>
        ))}
      </ul>
    </Section>
  );
}
