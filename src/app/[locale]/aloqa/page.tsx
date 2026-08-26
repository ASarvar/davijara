import type { Metadata } from "next";
import { Clock, Mail, MapPin, Phone } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { contacts, site } from "@/content/site";
import { IconTile } from "@/components/common/icon-tile";
import { SurfaceCard } from "@/components/common/surface-card";
import { SocialLinks } from "@/components/layout/social-links";
import { Section } from "@/components/layout/section";
import { OfficeMapPanel } from "@/components/map/office-map-panel";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "contact" });
  return { title: t("title"), description: t("metaDescription") };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("contact");

  const { address, hours } = contacts;

  return (
    <Section tone="deep" className="flex-1">
      <h1 className="font-heading text-3xl font-semibold sm:text-4xl">
        {t("title")}
      </h1>
      <p className="text-muted-foreground mt-3 max-w-2xl text-pretty">
        {site.operator}
      </p>

      {/*
        Details on the left, map on the right, and the map is the WIDER column
        at `lg`. A contact page's map is not an illustration beside the text —
        it is the part a reader zooms and drags, and a narrow one is a map you
        cannot use.
      */}
      <div className="mt-10 grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-8">
        <div className="grid gap-4">
          {/*
            <address> is the correct element for an organisation's own contact
            details, and it carries them as a group for assistive tech. Its UA
            italics are removed — the browser default is a typographic
            convention, not a meaning we want.
          */}
          <address className="grid gap-4 not-italic">
            <SurfaceCard padding="md" radius="lg" className="flex gap-4">
              <IconTile size="sm">
                <MapPin aria-hidden="true" className="size-4" />
              </IconTile>
              <div className="min-w-0">
                <h2 className="font-heading text-sm font-semibold">
                  {t("address")}
                </h2>
                <p className="text-muted-foreground mt-1 text-sm text-pretty">
                  {address.full}
                </p>
              </div>
            </SurfaceCard>

            <SurfaceCard padding="md" radius="lg" className="flex gap-4">
              <IconTile size="sm">
                <Phone aria-hidden="true" className="size-4" />
              </IconTile>
              <div className="min-w-0">
                <h2 className="font-heading text-sm font-semibold">
                  {t("hotline")}
                </h2>
                <a
                  href={contacts.phoneHref}
                  className="text-accent-foreground mt-1 block text-lg font-semibold tabular-nums transition-opacity hover:opacity-80"
                >
                  {contacts.phone}
                </a>
              </div>
            </SurfaceCard>

            <SurfaceCard padding="md" radius="lg" className="flex gap-4">
              <IconTile size="sm">
                <Mail aria-hidden="true" className="size-4" />
              </IconTile>
              <div className="min-w-0">
                <h2 className="font-heading text-sm font-semibold">
                  {t("email")}
                </h2>
                {/*
                  `break-all` so a long address wraps inside the card instead
                  of pushing the whole column wider — an email has no spaces
                  for the browser to break at.
                */}
                <a
                  href={contacts.emailHref}
                  className="text-accent-foreground mt-1 block text-sm break-all transition-opacity hover:opacity-80"
                >
                  {contacts.email}
                </a>
              </div>
            </SurfaceCard>
          </address>

          <SurfaceCard padding="md" radius="lg" className="flex gap-4">
            <IconTile size="sm">
              <Clock aria-hidden="true" className="size-4" />
            </IconTile>
            <div className="min-w-0">
              <h2 className="font-heading text-sm font-semibold">
                {t("hours")}
              </h2>
              <p className="text-muted-foreground mt-1 text-sm">
                {hours.weekdays}
              </p>
              <p className="text-muted-foreground text-sm">{hours.lunch}</p>
              <p className="text-muted-foreground text-sm">{hours.weekend}</p>
            </div>
          </SurfaceCard>

          {/* Renders nothing while content/site.ts has no account URLs. */}
          <SocialLinks className="flex items-center gap-4 px-1" />
        </div>

        {/*
          THE MAP, or the address on its own.

          `coords` is null until someone reads the exact point off a map — see
          the note in content/site.ts. OpenStreetMap has Buxoro ko'chasi but
          not house number 6, so a pin here would be a state portal telling a
          citizen which door to walk to and being wrong by a block. The panel
          below says so plainly rather than silently rendering nothing.
        */}
        {address.coords ? (
          <div className="border-hairline h-[26rem] overflow-hidden rounded-xl border lg:h-[34rem]">
            {/* A client wrapper, because `dynamic(..., { ssr: false })` cannot
                be called from a Server Component — see office-map-panel.tsx. */}
            <OfficeMapPanel
              lat={address.coords.lat}
              lng={address.coords.lng}
              label={address.full}
            />
          </div>
        ) : (
          <SurfaceCard
            padding="lg"
            radius="lg"
            className="flex h-[16rem] flex-col items-center justify-center text-center lg:h-[34rem]"
          >
            <IconTile size="lg" className="mb-4">
              <MapPin aria-hidden="true" className="size-6" />
            </IconTile>
            <p className="font-heading text-lg font-semibold">
              {address.full}
            </p>
            <p className="text-muted-foreground mt-2 max-w-sm text-sm text-pretty">
              {t("mapPending")}
            </p>
          </SurfaceCard>
        )}
      </div>
    </Section>
  );
}
