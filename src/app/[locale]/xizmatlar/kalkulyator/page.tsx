import type { Metadata } from "next";
import { Building2, MapPin, RefreshCw } from "lucide-react";
import { setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { Section } from "@/components/layout/section";
import { RentCalculator } from "@/components/sections/rent-calculator";

export const metadata: Metadata = {
  title: "Ijara kalkulatori",
  description:
    "Obyekt maydoni, turi va joylashuviga ko'ra taxminiy yillik ijara to'lovini hisoblang.",
};

const features = [
  {
    icon: MapPin,
    title: "Hudud koeffitsienti",
    text: "Narx viloyat va shaharga qarab o'zgaradi.",
  },
  {
    icon: Building2,
    title: "Obyekt turiga qarab",
    text: "Ofis, ombor, savdo va ma'muriy binolar uchun alohida tariflar.",
  },
  {
    icon: RefreshCw,
    title: "Har yili yangilanadi",
    text: "Eng kam stavkalar Vazirlar Mahkamasi qarori asosida belgilanadi.",
  },
];

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return (
    <Section tone="deep">
      <div className="grid gap-10 lg:grid-cols-2 lg:gap-16">
        <div>
          <p className="text-accent-foreground mb-3 text-xs font-semibold tracking-[0.18em] uppercase">
            Interaktiv xizmatlar
          </p>
          <h1 className="font-heading text-3xl font-semibold text-balance sm:text-4xl">
            Obyekt narxini oldindan biling
          </h1>
          <p className="text-muted-foreground mt-4 text-pretty">
            Kalkulyator amaldagi eng kam ijara stavkalari va hudud
            koeffitsientlari asosida taxminiy yillik to&apos;lovni hisoblaydi.
            Yakuniy narx auksion natijasida belgilanadi.
          </p>

          <ul className="mt-9 space-y-6">
            {features.map((f) => (
              <li key={f.title} className="flex gap-4">
                <span className="bg-accent text-accent-foreground flex size-10 shrink-0 items-center justify-center rounded-lg">
                  <f.icon aria-hidden="true" className="size-5" />
                </span>
                <span>
                  <span className="block text-sm font-semibold">{f.title}</span>
                  <span className="text-muted-foreground mt-1 block text-sm">
                    {f.text}
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
