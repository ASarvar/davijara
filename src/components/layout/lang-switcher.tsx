"use client";

import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { localeLabels, localeNames, publishedLocales } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Language switcher.
 *
 * In the legacy site this was three buttons whose only handler toggled an
 * `active` CSS class — clicking "Ru" highlighted the chip and changed nothing
 * else. These are real links now: `usePathname` from next-intl returns the
 * locale-agnostic path, so switching language keeps the user on the page they
 * were reading instead of dumping them at the homepage.
 *
 * Only PUBLISHED locales are offered (`publishedLocales`): a chip for one
 * that redirects back to Uzbek would be a control that does nothing. With
 * only one open there is nothing to switch to, and the group is not drawn.
 *
 * The QUERY travels too: a reader on /uz/obyektlar?hudud=… who switches to
 * Russian expects the same filtered list, not the whole catalogue. Reading
 * it takes `useSearchParams`, which on a prerendered page must sit under
 * Suspense (see yandex-metrica-hit.tsx). The fallback is the same chips
 * without the query, so the static HTML is what it always was and the
 * filters are added once the page hydrates.
 */
export function LangSwitcher({ className }: { className?: string }) {
  if (publishedLocales.length < 2) return null;

  return (
    <Suspense fallback={<LocaleLinks className={className} />}>
      <LocaleLinksWithQuery className={className} />
    </Suspense>
  );
}

function LocaleLinksWithQuery({ className }: { className?: string }) {
  const searchParams = useSearchParams();
  const query: Record<string, string | string[]> = {};
  for (const key of new Set(searchParams.keys())) {
    const values = searchParams.getAll(key);
    query[key] = values.length > 1 ? values : values[0]!;
  }
  return <LocaleLinks className={className} query={query} />;
}

function LocaleLinks({
  className,
  query,
}: {
  className?: string;
  query?: Record<string, string | string[]>;
}) {
  const pathname = usePathname();
  const active = useLocale();
  const t = useTranslations("topbar");

  return (
    <div
      role="group"
      aria-label={t("languageLabel")}
      className={cn("flex items-center gap-1.5", className)}
    >
      {publishedLocales.map((locale) => {
        const isActive = locale === active;
        return (
          <Link
            key={locale}
            href={query ? { pathname, query } : pathname}
            locale={locale}
            hrefLang={locale}
            aria-current={isActive ? "true" : undefined}
            title={localeNames[locale]}
            className={cn(
              "rounded px-2 py-0.5 text-xs leading-5 transition-colors",
              // Semantic border tokens, not raw gold: these keep their gold
              // tint in the brand palette but become solid white / yellow in
              // high-contrast mode, where a 20%-alpha gold chip outline is
              // invisible on black.
              "border-hairline border",
              isActive
                ? "bg-accent text-accent-foreground border-outline font-semibold"
                : "text-muted-foreground hover:text-accent-foreground hover:border-outline",
            )}
          >
            {localeLabels[locale]}
            <span className="sr-only"> — {localeNames[locale]}</span>
          </Link>
        );
      })}
    </div>
  );
}
