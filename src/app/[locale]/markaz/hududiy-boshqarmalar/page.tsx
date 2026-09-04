import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Clock3, Mail, MapPin, Phone, Send, UserRound } from "lucide-react";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import type { Locale } from "@/i18n/routing";
import { Section } from "@/components/layout/section";
import { SurfaceCard } from "@/components/common/surface-card";
import { getTerritorialOffices } from "@/lib/data/territorial";
import { mediaSrc } from "@/lib/media/src";

/*
  Hududiy boshqarmalar — the 14 territorial administrations, one card per
  region (see lib/data/territorial.ts).

  DELIBERATELY NOT the qabul-kunlari / markaziy-apparat card shape: those are
  a short, wide, single-column list because there are 3 and then 9 of them.
  This is 14 — a single column of wide rows would run the length of the
  page — so it is a GRID of compact cards instead, one per region, small
  photo, region as the scannable label a citizen is actually searching by.
*/

const NAV_KEY = "territorial";

export const revalidate = 300;

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const tNav = await getTranslations({ locale, namespace: "nav" });
  return { title: tNav(NAV_KEY) };
}

export default async function TerritorialPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [tNav, tCommon, offices] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    getTerritorialOffices(),
  ]);

  return (
    <Section tone="deep">
      <Breadcrumbs items={[{ label: tNav("centre"), href: "/markaz" }, { label: tNav(NAV_KEY) }]} />

      <div className="mx-auto mb-20">
        <h1
          data-split
          className="font-heading text-center text-2xl font-semibold text-balance sm:text-3xl lg:text-4xl"
        >
          {tNav(NAV_KEY)}
        </h1>

        {offices.length > 0 ? (
          <p className="text-muted-foreground mt-3 text-center text-sm">
            {offices.length} ta hududiy boshqarma
          </p>
        ) : null}

        {offices.length === 0 ? (
          <p className="border-hairline text-muted-foreground mt-8 rounded-lg border border-dashed px-4 py-6 text-center text-sm text-pretty">
            {tCommon("sectionPending", { section: tNav(NAV_KEY) })}
          </p>
        ) : (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {offices.map((office) => (
              <SurfaceCard
                key={office.regionId}
                padding="lg"
                interactive
                radius="md"
                data-reveal="up"
                className="flex flex-col gap-4"
              >
                <div className="text-accent-foreground">
                  <span className="text-xs font-semibold tracking-wide uppercase">
                    {office.region}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  {office.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element -- served from public/, see src.ts.
                    <img
                      src={mediaSrc(office.photo)}
                      alt=""
                      width={60}
                      height={60}
                      className="w-[81px] h-[108px] shrink-0 rounded-xs object-cover"
                    />
                  ) : (
                    <span
                      aria-hidden="true"
                      className="bg-secondary text-muted-foreground flex size-[72px] shrink-0 items-center justify-center rounded-md"
                    >
                      <UserRound className="size-7" />
                    </span>
                  )}

                  <div className="min-w-0">
                    <p className="font-heading text-base font-semibold text-balance">
                      {office.fullName}
                    </p>
                    <p className="text-muted-foreground text-xs text-pretty">
                      {office.title}
                    </p>
                  </div>
                </div>

                <dl className="border-hairline space-y-1.5 border-t pt-3 text-xs">
                  {office.phone ? (
                    <div className="flex items-center gap-1.5">
                      <Phone
                        aria-hidden="true"
                        className="text-accent-foreground size-3.5 shrink-0"
                      />
                      <dd>
                        <a
                          href={`tel:${office.phone.replace(/[^\d+]/g, "")}`}
                          className="hover:text-accent-foreground transition-colors"
                        >
                          {office.phone}
                        </a>
                      </dd>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-1.5">
                    <Mail
                      aria-hidden="true"
                      className="text-accent-foreground size-3.5 shrink-0"
                    />
                    <dd className="min-w-0 break-all">
                      <a
                        href={`mailto:${office.email}`}
                        className="hover:text-accent-foreground transition-colors"
                      >
                        {office.email}
                      </a>
                    </dd>
                  </div>

                  {office.receptionHours ? (
                    <div className="flex items-center gap-1.5">
                      <Clock3
                        aria-hidden="true"
                        className="text-accent-foreground size-3.5 shrink-0"
                      />
                      <dd>{office.receptionHours}</dd>
                    </div>
                  ) : null}
                  <div className="flex items-start gap-1.5">
                    <MapPin
                      aria-hidden="true"
                      className="text-accent-foreground size-3.5 shrink-0 translate-y-0.5"
                    />
                    <dd>
                      <a
                        href={
                          office.lat != null && office.lng != null
                            ? `https://www.google.com/maps/search/?api=1&query=${office.lat},${office.lng}`
                            : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(office.address)}`
                        }
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-muted-foreground hover:text-accent-foreground transition-colors"
                      >
                        {office.address}
                      </a>
                    </dd>
                  </div>
                </dl>
              </SurfaceCard>
            ))}
          </div>
        )}
      </div>
    </Section>
  );
}
