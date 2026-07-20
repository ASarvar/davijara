import { getTranslations } from "next-intl/server";

/**
 * Skip-to-content link — absent from the legacy site.
 *
 * Visually hidden until focused, so keyboard and screen-reader users can jump
 * past the topbar and eight nav links straight to the page body. WCAG 2.1
 * 2.4.1 (Bypass Blocks).
 */
export async function SkipLink() {
  const t = await getTranslations("common");

  return (
    <a
      href="#main"
      className="bg-accent text-accent-foreground focus:ring-ring sr-only rounded-md px-4 py-2 text-sm font-semibold focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:ring-2"
    >
      {t("skipToContent")}
    </a>
  );
}
