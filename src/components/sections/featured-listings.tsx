import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getFeaturedListings, getRegions } from "@/lib/data/catalog";
import { ActionLink } from "@/components/common/action-link";
import { SurfaceCard } from "@/components/common/surface-card";
import { ListingPlaceholder } from "@/components/common/placeholder/listing-placeholder";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Section, SectionHeader } from "@/components/layout/section";
import { formatArea, formatSom } from "@/lib/format";

export async function FeaturedListings() {
  const t = await getTranslations("listings");
  const tc = await getTranslations("common");
  const [listings, regions] = await Promise.all([
    getFeaturedListings(),
    getRegions(),
  ]);
  const regionName = (slug: string) =>
    regions.find((r) => r.slug === slug)?.name ?? slug;

  return (
    <Section tone="deep">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        action={<ActionLink href="/obyektlar">{t("action")}</ActionLink>}
      />

      <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing, i) => (
          <SurfaceCard
            as="li"
            key={listing.id}
            padding="none"
            interactive
            data-reveal="up"
            style={{ "--i": i } as React.CSSProperties}
            className="group flex flex-col overflow-hidden"
          >
            {/*
              The legacy markup showed the SAME hotlinked photo on all three
              cards. These are branded architectural placeholders, with the
              variant derived from the listing id so the cards look distinct
              and each listing keeps a stable identity. `aspect-video`
              reserves the box, so swapping in real photography later cannot
              introduce layout shift.
            */}
            <div className="bg-secondary relative aspect-video overflow-hidden">
              {/*
                Variant by index, not by id hash. Hashing gives no guarantee
                of distinctness — three ids into four buckets collide about
                62% of the time, and these ids differ only in their last few
                digits. Index guarantees the visible cards look different,
                which is the actual requirement here.
              */}
              <ListingPlaceholder
                variant={(i % 4) as 0 | 1 | 2 | 3}
                className="transition-transform duration-500 ease-out group-hover:scale-[1.04]"
              />
              <Badge className="absolute top-3 left-3">
                {listing.auctionUrl ? t("badgeAuction") : t("badgeNew")}
              </Badge>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <h3 className="group-hover:text-accent-foreground text-base leading-snug font-semibold text-balance transition-colors duration-200">
                {listing.title}
              </h3>
              <p className="text-muted-foreground mt-2 text-sm">
                {regionName(listing.region)} · {listing.address} ·{" "}
                {formatArea(listing.area)}
              </p>

              <div className="border-border mt-5 flex items-end justify-between gap-3 border-t pt-4">
                <p>
                  <span className="font-heading text-accent-foreground block text-xl font-semibold">
                    {formatSom(listing.pricePerYear)}
                  </span>
                  <span className="text-muted-foreground text-xs">
                    {t("perYear")}
                  </span>
                </p>
                <Button asChild size="sm" variant="outline">
                  <Link href={`/obyektlar/${listing.id}`}>
                    {tc("readMore")}
                    <span className="sr-only"> — {listing.title}</span>
                  </Link>
                </Button>
              </div>
            </div>
          </SurfaceCard>
        ))}
      </ul>
    </Section>
  );
}
