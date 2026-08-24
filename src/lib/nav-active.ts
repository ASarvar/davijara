import type { NavItem } from "@/content/site";

/**
 * Does `pathname` sit at or below `href`?
 *
 * `startsWith(href)` alone is wrong and was: `/markaz` is a prefix of
 * `/markazi-apparat` as a STRING, so a sibling route could light up an
 * unrelated menu item. Anchoring on the separator makes it a path test rather
 * than a text test.
 */
function covers(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/**
 * Which of `hrefs` should carry the active mark, if any.
 *
 * THE LONGEST MATCH WINS, and that is the whole reason this is a function
 * rather than a `startsWith` at each call site. Now that sections have real
 * children, several entries in one menu legitimately cover the same URL:
 * "Markaz haqida" is `/markaz` and "Vazifa va funksiyalar" is
 * `/markaz/vazifalar`, so on the latter page BOTH matched and the dropdown
 * marked two items at once.
 *
 * Exact-matching the children instead would have fixed that and broken the
 * other half: `/imtiyozlar/it` is a real filter route, and its menu item is
 * `/imtiyozlar`, which an exact test would leave unmarked. Most-specific-wins
 * is the rule that satisfies both.
 */
export function activeHref(pathname: string, hrefs: string[]): string | null {
  let best: string | null = null;
  for (const href of hrefs) {
    if (!covers(pathname, href)) continue;
    if (best === null || href.length > best.length) best = href;
  }
  return best;
}

/**
 * Is this section the one the reader is inside?
 *
 * A parent counts its children's routes as its own — otherwise the header
 * would show no current section on a page that plainly belongs to one. No
 * most-specific-wins here: two SECTIONS covering one URL would be an
 * information-architecture bug, not something to resolve silently at render
 * time.
 */
export function isSectionActive(pathname: string, item: NavItem): boolean {
  const hrefs = [item.href, ...(item.children ?? []).map((c) => c.href)];
  return hrefs.some((href) => covers(pathname, href));
}
