import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "Normativ hujjatlar" };

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return (
    <PlaceholderPage
      title="Normativ hujjatlar"
      description="Normativ-huquqiy hujjatlar bazasi tayyorlanmoqda."
    />
  );
}
