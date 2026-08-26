import type { Metadata } from "next";
import { Building2, MapPin, RefreshCw } from "lucide-react";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { Section } from "@/components/layout/section";
import { IconTile } from "@/components/common/icon-tile";
import { RentCalculator } from "@/components/sections/rent-calculator";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "calculator" });
  return { title: t("title"), description: t("metaDescription") };
}

/*
  Icon + two message KEYS, not the copy itself. The list is a fixed set of
  three, so the keys are the structure and `messages/*.json` holds every word
  of it.
*/
const FEATURES = [
  { icon: MapPin, key: "regionFactor" },
  { icon: Building2, key: "typeFactor" },
  { icon: RefreshCw, key: "yearly" },
] as const;

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  const t = await getTranslations("calculator");

  return (
    <Section tone="deep">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <h1 className="font-heading text-xl font-semibold text-balance sm:text-2xl lg:text-3xl">
            {t("pageLead")}
          </h1>
          <p className="text-muted-foreground mt-4 text-sm text-pretty">
            {t("pageLede")}
          </p>

          <ul className="mt-9 space-y-6">
            {FEATURES.map((f) => (
              <li key={f.key} data-reveal="left" className="flex gap-4">
                <IconTile>
                  <f.icon aria-hidden="true" className="size-5" />
                </IconTile>
                <span>
                  <span className="block text-sm font-semibold">
                    {t(f.key)}
                  </span>
                  <span className="text-muted-foreground mt-1 block text-sm">
                    {t(`${f.key}Text`)}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <RentCalculator />
      </div>
    </Section>
  );
}
