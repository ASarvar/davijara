import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Ijara obyektlari" };

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return (
    <PlaceholderPage
      title="Ijara obyektlari"
      description="Bo'sh davlat mulki obyektlarini hudud, tur va maydon bo'yicha qidirish bo'limi tayyorlanmoqda."
    />
  );
}
