import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { Mail, Phone, UserRound } from "lucide-react";

import { Breadcrumbs } from "@/components/common/breadcrumbs";
import type { Locale } from "@/i18n/routing";
import { Section } from "@/components/layout/section";
import { SurfaceCard } from "@/components/common/surface-card";
import { getWorkers, WORKERS_EMAIL } from "@/lib/data/workers";
import { mediaSrc } from "@/lib/media/src";

/*
  Markaziy apparat — the central apparatus staff directory: one card per
  unit that has a head on record (see lib/data/workers.ts), in the org
  chart's own reading order.

  Same PLAIN TEXT PAGE FAMILY and same card shape as markaz/qabul-kunlari
  (rahbariyat): the PERSON leads each card, the unit name is the subtitle
  and their specific position within it comes below that — the operator's
  call, so both pages read the same way despite listing different things.
*/

const NAV_KEY = "apparatus";

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

export default async function WorkersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  const [tNav, tCommon, workers] = await Promise.all([
    getTranslations("nav"),
    getTranslations("common"),
    getWorkers(),
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

        {workers.length === 0 ? (
          <p className="border-hairline text-muted-foreground mt-8 rounded-lg border border-dashed px-4 py-6 text-center text-sm text-pretty">
            {tCommon("sectionPending", { section: tNav(NAV_KEY) })}
          </p>
        ) : (
          <div className="mt-8 space-y-4">
            {workers.map((worker) => (
              <SurfaceCard
                key={worker.unitId}
                padding="lg"
                data-reveal="up"
                className="flex flex-col gap-5 sm:flex-row sm:items-center"
              >
                {worker.photo ? (
                  // eslint-disable-next-line @next/next/no-img-element -- served from public/, see src.ts.
                  <img
                    src={mediaSrc(worker.photo)}
                    alt=""
                    width={150}
                    height={150}
                    className="size-[150px] shrink-0 rounded-full object-cover"
                  />
                ) : (
                  <span
                    aria-hidden="true"
                    className="bg-secondary text-muted-foreground flex size-[150px] shrink-0 items-center justify-center rounded-full"
                  >
                    <UserRound className="size-10" />
                  </span>
                )}

                <div className="min-w-0 flex-1">
                  <p className="font-heading text-lg font-semibold text-balance">
                    {worker.fullName}
                  </p>
                  <p className="mt-1 text-sm font-medium text-pretty">
                    {worker.unitName}
                  </p>
                  <p className="text-muted-foreground text-sm text-pretty">
                    {worker.position}
                  </p>
                </div>

                <dl className="border-hairline flex shrink-0 flex-col gap-2 border-t pt-4 text-sm sm:border-t-0 sm:border-l sm:pt-0 sm:pl-6">
                  {worker.phone ? (
                    <div className="flex items-center gap-2">
                      <Phone
                        aria-hidden="true"
                        className="text-accent-foreground size-4 shrink-0"
                      />
                      <dd>
                        <a
                          href={`tel:${worker.phone.replace(/[^\d+]/g, "")}`}
                          className="hover:text-accent-foreground transition-colors"
                        >
                          {worker.phone}
                        </a>
                      </dd>
                    </div>
                  ) : null}

                  <div className="flex items-center gap-2">
                    <Mail
                      aria-hidden="true"
                      className="text-accent-foreground size-4 shrink-0"
                    />
                    <dd>
                      <a
                        href={`mailto:${WORKERS_EMAIL}`}
                        className="hover:text-accent-foreground transition-colors"
                      >
                        {WORKERS_EMAIL}
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
