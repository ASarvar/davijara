import type { Metadata } from "next";
import { getTranslations, setRequestLocale } from "next-intl/server";

import type { Locale } from "@/i18n/routing";
import { PrivilegesView } from "@/components/sections/privileges-view";
import { localeAlternates } from "@/lib/seo";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}): Promise<Metadata> {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "privileges" });
  return {
    alternates: localeAlternates(locale, "/imtiyozlar"),
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function PrivilegesPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale as Locale);
  return <PrivilegesView active="barchasi" />;
}
