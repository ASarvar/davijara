"use client";

import { useLocale, useTranslations } from "next-intl";
import { Link, usePathname } from "@/i18n/navigation";
import { locales, localeLabels, localeNames } from "@/i18n/routing";
import { cn } from "@/lib/utils";

/**
 * Language switcher.
 *
 * In the legacy site this was three buttons whose only handler toggled an
 * `active` CSS class — clicking "Ru" highlighted the chip and changed nothing
 * else. These are real links now: `usePathname` from next-intl returns the
 * locale-agnostic path, so switching language keeps the user on the page they
 * were reading instead of dumping them at the homepage.
 */
export function LangSwitcher({ className }: { className?: string }) {
  const pathname = usePathname();
  const active = useLocale();
  const t = useTranslations("topbar");

  return (
    <div
      role="group"
      aria-label={t("languageLabel")}
      className={cn("flex items-center gap-1.5", className)}
    >
      {locales.map((locale) => {
        const isActive = locale === active;
        return (
          <Link
            key={locale}
            href={pathname}
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
