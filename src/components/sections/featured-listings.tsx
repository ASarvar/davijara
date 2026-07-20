import { ArrowRight, Building2 } from "lucide-react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { getFeaturedListings, getRegions } from "@/lib/data/catalog";
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
    <Section tone="deep" className="bg-[color:var(--color-cobalt)]/6 border-y border-[color:var(--color-gold)]/8">
      <SectionHeader
        eyebrow={t("eyebrow")}
        title={t("title")}
        action={
          <Link
            href="/obyektlar"
            className="text-accent-foreground inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
          >
            {t("action")}
            <ArrowRight aria-hidden="true" className="size-4" />
          </Link>
        }
      />

      <ul className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {listings.map((listing) => (
          <li
            key={listing.id}
            className="border-border bg-card flex flex-col overflow-hidden rounded-xl border"
          >
            {/*
              The legacy markup showed the SAME hotlinked photo on all three
              cards. Rather than repeat one building three times, cards render
              a branded placeholder until real, self-hosted photography exists.
              `aspect-video` reserves the box either way, so swapping images in
              later cannot introduce layout shift.
            */}
            <div className="bg-secondary relative flex aspect-video items-center justify-center">
              <Building2
                aria-hidden="true"
                className="text-muted-foreground/40 size-10"
              />
              <Badge className="absolute top-3 left-3">
                {listing.auctionUrl ? t("badgeAuction") : t("badgeNew")}
              </Badge>
            </div>

            <div className="flex flex-1 flex-col p-5">
              <h3 className="text-base leading-snug font-semibold text-balance">
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
          </li>
        ))}
      </ul>
    </Section>
  );
}
