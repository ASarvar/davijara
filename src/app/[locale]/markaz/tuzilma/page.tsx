import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { PlaceholderPage } from "@/components/layout/placeholder-page";

/*
  The page's name lives in `messages/*.json` under `nav`, exactly once, and
  both the browser-tab title and the on-page heading read it from there — see
  the note on `navKey` in placeholder-page.tsx.
*/
const NAV_KEY = "structure";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "nav" });
  return { title: t(NAV_KEY) };
}

export default async function Page({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <PlaceholderPage navKey={NAV_KEY} />;
}
