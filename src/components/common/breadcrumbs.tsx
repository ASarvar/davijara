import { Fragment } from "react";
import { getTranslations } from "next-intl/server";

import { Link } from "@/i18n/navigation";
import { cn } from "@/lib/utils";

/**
 * The crumb trail above a page heading.
 *
 * Written out by hand in eighteen files before this existed, which is how the
 * landmark ended up labelled `aria-label="Breadcrumb"` — an English word, in
 * eighteen places, on a trilingual portal. A screen reader announces that
 * label, so it is visible text by every measure that matters; it is now
 * `common.breadcrumb` and translated once.
 *
 * The home crumb is NOT passed in. Every caller started with it, so making it
 * part of the component is what guarantees the trail cannot drift page to page
 * — `items` is everything after Bosh sahifa.
 *
 * An item with an `href` renders as a link, one without renders as the current
 * page. The last item is usually the latter, but not always: the article page
 * ends its trail on a LINK to /yangiliklar and deliberately omits the headline,
 * which is already the <h1> directly below (see the note there). So this makes
 * no assumption about the final item.
 *
 * A Server Component, and every caller is one — the trail is static markup, so
 * shipping the strings as HTML costs nothing at runtime.
 */
export interface Crumb {
  label: string;
  /** Omit for the current page: renders as plain text rather than a link. */
  href?: string;
}

export async function Breadcrumbs({
  items,
  className,
}: {
  items: Crumb[];
  className?: string;
}) {
  const t = await getTranslations("common");

  const linkClass = "hover:text-accent-foreground transition-colors";

  return (
    <nav aria-label={t("breadcrumb")} className={cn("mb-6", className)}>
      <ol className="text-muted-foreground flex flex-wrap items-center gap-2 text-sm">
        <li>
          <Link href="/" className={linkClass}>
            {t("breadcrumbHome")}
          </Link>
        </li>
        {items.map((item, i) => (
          // Index keys: the trail is a fixed list rendered once per page, never
          // reordered or filtered.
          <Fragment key={i}>
            {/* The separator is decoration — a screen reader reads the <ol>
                structure, and hearing "slash" between every crumb is noise. */}
            <li aria-hidden="true">/</li>
            <li className={item.href ? undefined : "text-foreground"}>
              {item.href ? (
                <Link href={item.href} className={linkClass}>
                  {item.label}
                </Link>
              ) : (
                item.label
              )}
            </li>
          </Fragment>
        ))}
      </ol>
    </nav>
  );
}
