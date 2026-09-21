/*
  Which of the explorer's two tabs is open.

  ITS OWN MODULE, and that is the point: `lib/data/listings.ts` starts with
  `import "server-only"` — it holds the API credentials and `unstable_cache` —
  so a client component importing anything from it drags the whole server
  module into the browser bundle and the build fails outright. The explorer is
  a client component and needs the key name, so the key lives here, where
  nothing server-side is reachable.

  `listings.ts` re-exports these, so server code keeps one import site and
  there is still a single definition of the key.

  In the URL rather than React state for the same reason the filters are: the
  search panel submits a real GET form, so every search is a full navigation.
  Held in state, the explorer remounted at its default and a reader who had
  switched to the list was thrown back to the map on every search — and on
  every page of the pager.
*/

export const VIEW_KEY = "korinish";

export type ListingsView = "xarita" | "royxat";

/**
 * The open tab.
 *
 * THE DEFAULT IS PER PAGE, which is why it is an argument rather than a
 * constant here. The homepage's section is a map of the country and opens on
 * the map; /ijaraga-obyektlar is a catalogue and opens on the list, at the
 * operator's request — someone who came to browse lots should not have to
 * press a tab to see any.
 *
 * Both values are read back explicitly, so a URL can say "map" on a page
 * whose default is the list and be believed. Everything that carries the tab
 * across a navigation — `buildFilterQuery`, the search panel's hidden field,
 * the explorer's own tab handler — passes the written value through
 * unchanged and writes nothing when the reader is on the page's default.
 */
export function parseView(
  searchParams: Record<string, string | string[] | undefined>,
  fallback: ListingsView = "xarita",
): ListingsView {
  const raw = searchParams[VIEW_KEY];
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "royxat" || value === "xarita") return value;
  return fallback;
}
