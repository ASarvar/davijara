import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import {
  PRIVILEGE_CATEGORIES,
  getPrivilegeCounts,
} from "@/lib/data/privileges";
import type { PrivilegeCategory } from "@/types/content";
import { cn } from "@/lib/utils";

/**
 * Category filter chips.
 *
 * Server-rendered links rather than click handlers. The legacy version was a
 * client-side `classList` toggle that hid cards with `style.display`, which
 * meant: the filtered view had no URL, could not be linked or bookmarked, the
 * back button did nothing, and search engines only ever saw the unfiltered
 * page. Each chip is now a real URL (?kategoriya=it) that the server renders
 * directly — independently addressable, indexable, and free of JavaScript.
 */
export async function PrivilegeFilter({
  active,
}: {
  active: PrivilegeCategory | "barchasi";
}) {
  const t = await getTranslations("privileges");
  const tc = await getTranslations("common");
  const counts = await getPrivilegeCounts();

  const chips = [
    { value: "barchasi" as const, label: tc("all") },
    ...PRIVILEGE_CATEGORIES,
  ];

  return (
    <nav aria-label={t("filterLabel")}>
      <ul className="flex flex-wrap gap-2">
        {chips.map((chip) => {
          const isActive = chip.value === active;
          return (
            <li key={chip.value}>
              <Link
                href={
                  chip.value === "barchasi"
                    ? "/imtiyozlar"
                    : `/imtiyozlar/${chip.value}`
                }
                aria-current={isActive ? "true" : undefined}
                className={cn(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm transition-colors",
                  isActive
                    ? "border-[color:var(--color-gold)] bg-accent text-accent-foreground font-semibold"
                    : "border-border text-muted-foreground hover:border-[color:var(--color-gold)]/40 hover:text-foreground",
                )}
              >
                {chip.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 text-xs",
                    isActive ? "bg-[color:var(--color-gold)]/20" : "bg-secondary",
                  )}
                >
                  {counts[chip.value]}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
