import type { Metadata } from "next";
import { setRequestLocale } from "next-intl/server";
import type { Locale } from "@/i18n/routing";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

export const metadata: Metadata = { title: "PQ-447-son qarori 5-ilovasidagi maʼlumotlar" };

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <PlaceholderPage title="PQ-447-son qarori 5-ilovasidagi maʼlumotlar" />;
}
