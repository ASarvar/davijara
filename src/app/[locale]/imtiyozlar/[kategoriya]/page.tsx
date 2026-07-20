import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTranslations, setRequestLocale } from "next-intl/server";

import { routing, type Locale } from "@/i18n/routing";
import {
  PRIVILEGE_CATEGORIES,
  isPrivilegeCategory,
} from "@/lib/data/privileges";
import { PrivilegesView } from "@/components/sections/privileges-view";

/** All four categories x three locales, prerendered at build time. */
export function generateStaticParams() {
  return routing.locales.flatMap((locale) =>
    PRIVILEGE_CATEGORIES.map((c) => ({ locale, kategoriya: c.value })),
  );
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string; kategoriya: string }>;
}): Promise<Metadata> {
  const { locale, kategoriya } = await params;
  const t = await getTranslations({ locale, namespace: "privileges" });

  const category = PRIVILEGE_CATEGORIES.find((c) => c.value === kategoriya);
  if (!category) return { title: t("pageTitle") };

  return {
    title: `${category.label} — ${t("title")}`,
    description: t("pageDescription"),
  };
}

export default async function PrivilegesCategoryPage({
  params,
}: {
  params: Promise<{ locale: string; kategoriya: string }>;
}) {
  const { locale, kategoriya } = await params;
  setRequestLocale(locale as Locale);

  if (!isPrivilegeCategory(kategoriya)) {
    notFound();
  }

  return <PrivilegesView active={kategoriya} />;
}
