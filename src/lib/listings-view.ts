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

/*
  `jonli` is the third tab, "Jonli savdolar": the map with only the lots
  whose bidding room is open. It exists only while something IS open, which
  the page cannot know on the server (see lib/live-auctions-client.ts) — so a
  URL asking for it is honoured here and then quietly replaced by the page's
  default in the explorer if nothing turns out to be live.
*/
export type ListingsView = "xarita" | "royxat" | "jonli";

/** Every value the URL may carry, for the places that pass it through. */
export const LISTINGS_VIEWS: readonly ListingsView[] = [
  "xarita",
  "royxat",
  "jonli",
];

export function isListingsView(value: unknown): value is ListingsView {
  return (LISTINGS_VIEWS as readonly unknown[]).includes(value);
}

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
  return isListingsView(value) ? value : fallback;
}

/*
  Which OFFER the homepage explorer shows: leases (the default) or
  privatization sales — "Ijara | Xususiylashtirish" above the tabs.

  A level ABOVE the tabs, not a tab beside Xarita and Hududlar: those two are
  views of one set, while this picks the set. As a third tab it read as one
  more way of looking at the same leases (operator, 09.10.2026). In the URL
  for the same reasons as the view — linkable, back-button correct, and the
  server sends only the set being shown.

  Never written for the default, so a lease URL stays clean.
*/
export const MARKET_KEY = "bolim";

/**
 * The PLACE half of a search — what survives a switch between the two
 * offers (MarketSwitch). The area, price and day bands are drawn per offer,
 * so they do not cross over. Here rather than in lib/data/listings.ts
 * because the switch's links are built where a client import must be safe.
 */
export const PLACE_KEYS = ["hudud", "tuman"] as const;

export type ListingsMarket = "ijara" | "xususiylashtirish";

export function parseMarket(
  searchParams: Record<string, string | string[] | undefined>,
): ListingsMarket {
  const raw = searchParams[MARKET_KEY];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value === "xususiylashtirish" ? "xususiylashtirish" : "ijara";
}

/*
  The catalogue's sort order — `?tartib=`, the Saralash field on
  /ijaraga-obyektlar and /xususiylashtirish.

  NOT a filter: it changes the order, never the set, so it is not in
  FILTER_KEYS and Tozalash keeps it, like the open tab. `buildFilterQuery`
  carries it through the pager so page 2 is page 2 of the same order.

  The default (no parameter) is the auction date, soonest first — the lots a
  reader can still act on soonest. It is spelled out as an option rather than
  left as "unsorted", because the lease feed's own order is whatever the
  service happened to return.
*/
export const SORT_KEY = "tartib";

export const LISTINGS_SORTS = [
  "sana",
  "arzon",
  "qimmat",
  "katta",
  "kichik",
] as const;

export type ListingsSort = (typeof LISTINGS_SORTS)[number];

export function parseSort(
  searchParams: Record<string, string | string[] | undefined>,
): ListingsSort {
  const raw = searchParams[SORT_KEY];
  const value = Array.isArray(raw) ? raw[0] : raw;
  return (LISTINGS_SORTS as readonly string[]).includes(value ?? "")
    ? (value as ListingsSort)
    : "sana";
}
