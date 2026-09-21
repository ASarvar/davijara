import { Link } from "@/i18n/navigation";

/**
 * Numbered page links for a results list.
 *
 * Real links, not buttons: each page of results is its own URL, so it can be
 * shared, bookmarked and reached by the back button. Only the neighbourhood
 * of the current page is printed, or a 900-page run would wrap to a dozen
 * lines on a phone. Same look as the pager on /sotilgan-obyektlar.
 */
export function Pager({
  current,
  pageCount,
  href,
  label,
}: {
  current: number;
  pageCount: number;
  href: (page: number) => string;
  /** Accessible name of the <nav> — from messages/, like every label. */
  label: string;
}) {
  if (pageCount <= 1) return null;

  return (
    <nav
      aria-label={label}
      className="mt-10 flex flex-wrap items-center justify-center gap-2"
    >
      {Array.from({ length: pageCount }, (_, i) => i + 1)
        .filter((n) => n === 1 || n === pageCount || Math.abs(n - current) <= 2)
        .map((n, i, list) => (
          <span key={n} className="flex items-center gap-2">
            {i > 0 && list[i - 1] !== n - 1 ? (
              <span aria-hidden="true" className="text-muted-foreground">
                …
              </span>
            ) : null}
            <Link
              href={href(n)}
              aria-current={n === current ? "page" : undefined}
              className={
                n === current
                  ? "border-outline bg-accent text-accent-foreground rounded-md border px-3 py-1.5 text-sm font-semibold tabular-nums"
                  : "border-hairline text-muted-foreground hover:text-accent-foreground hover:border-outline rounded-md border px-3 py-1.5 text-sm tabular-nums transition-colors"
              }
            >
              {n}
            </Link>
          </span>
        ))}
    </nav>
  );
}
