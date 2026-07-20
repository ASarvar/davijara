import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { Section } from "@/components/layout/section";
import { AccessibilityControls } from "@/components/sections/accessibility-controls";

export const metadata: Metadata = {
  title: "Maxsus imkoniyatlar",
  description:
    "Ko'rish qobiliyati cheklangan foydalanuvchilar uchun yuqori kontrastli rejim va matn o'lchamini sozlash.",
};

export default async function AccessibilityPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);

  return (
    <Section tone="deep">
      <div className="max-w-3xl">
        <h1 className="font-heading text-3xl font-semibold sm:text-4xl">
          Maxsus imkoniyatlar
        </h1>
        <p className="text-muted-foreground mt-4 text-pretty">
          Saytni o&apos;zingizga qulay ko&apos;rinishda sozlang. Tanlovingiz
          brauzeringizda saqlanadi va keyingi tashriflarda avtomatik
          qo&apos;llaniladi.
        </p>

        <div className="mt-10">
          <AccessibilityControls />
        </div>

        <div className="border-border mt-12 border-t pt-8">
          <h2 className="text-lg font-semibold">Klaviatura bilan boshqarish</h2>
          <dl className="text-muted-foreground mt-4 space-y-3 text-sm">
            <div className="flex flex-wrap gap-x-3">
              <dt className="text-foreground font-medium">Tab</dt>
              <dd>— keyingi elementga o&apos;tish</dd>
            </div>
            <div className="flex flex-wrap gap-x-3">
              <dt className="text-foreground font-medium">Shift + Tab</dt>
              <dd>— oldingi elementga qaytish</dd>
            </div>
            <div className="flex flex-wrap gap-x-3">
              <dt className="text-foreground font-medium">Enter / Space</dt>
              <dd>— tanlangan elementni faollashtirish</dd>
            </div>
            <div className="flex flex-wrap gap-x-3">
              <dt className="text-foreground font-medium">Esc</dt>
              <dd>— ochilgan oynani yopish</dd>
            </div>
          </dl>
          <p className="text-muted-foreground mt-5 text-sm">
            Sahifa boshida «Asosiy mazmunga o&apos;tish» havolasi mavjud — u
            menyuni o&apos;tkazib yuborib, to&apos;g&apos;ridan-to&apos;g&apos;ri
            sahifa mazmuniga olib boradi.
          </p>
        </div>
      </div>
    </Section>
  );
}
