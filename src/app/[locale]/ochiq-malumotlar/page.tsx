import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { SectionIndexPage } from "@/components/layout/section-index-page";

export const metadata: Metadata = { title: "Ochiq maʼlumotlar" };

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <SectionIndexPage navKey="openData" />;
}
