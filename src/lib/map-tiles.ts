/**
 * Shared basemap tile source for both Leaflet maps on the site
 * (`components/map/listings-map.tsx` and `office-map.tsx`).
 *
 * ┌──────────────────────────────────────────────────────────────────────────┐
 * │ OPENSTREETMAP'S OWN SERVER, AT THE OPERATOR'S CHOICE — READ THIS FIRST.  │
 * │                                                                          │
 * │ Two other sources were tried and ruled out first, for real reasons:      │
 * │   * CARTO's Voyager basemap (the original choice) now stamps every tile  │
 * │     "API KEY REQUIRED" for unauthenticated requests.                     │
 * │   * Wikimedia's tile service is flatly restricted to Wikimedia's own     │
 * │     sites ("Map tiles are restricted to Wikimedia and affiliated sites   │
 * │     only").                                                              │
 * │                                                                          │
 * │ OpenStreetMap's tile.openstreetmap.org is neither of those — read its    │
 * │ actual policy (operations.osmfoundation.org/policies/tiles) rather than  │
 * │ trust a summary of it, because the summary given here once was wrong.    │
 * │ It does NOT require prior arrangement for a normal website: a browser    │
 * │ loading tiles via a plain <img> — which is exactly what Leaflet's        │
 * │ <TileLayer> does — already sends the browser's own User-Agent and a      │
 * │ normal Referer, which the policy explicitly accepts ("Browsers will use  │
 * │ the browser's default User-Agent"). The policy's "no generic User-Agent" │
 * │ rule targets SDKs, native apps and server-side proxies, not this.        │
 * │                                                                          │
 * │ What it DOES say, and what makes this a choice rather than a fix:        │
 * │ "Availability is best-effort: there is no SLA or guarantee... We may     │
 * │ block access, without notice, if your usage degrades the service."       │
 * │ It also happened to be blocking THIS environment's traffic while this    │
 * │ was being evaluated — very likely from the repeated `curl` probing done  │
 * │ to test it, which the policy explicitly flags (a generic, unidentified   │
 * │ client sending many requests). That is a different thing from a real     │
 * │ browser loading the site normally, but it is exactly the kind of        │
 * │ unannounced blocking the policy reserves the right to do to anyone.      │
 * │                                                                          │
 * │ So: cheapest option, compliant as configured below, and the one            │
 * │ un-fixable risk is that OSMF can throttle or block the whole site's      │
 * │ traffic at their sole discretion with no support channel to escalate to. │
 * │ If the map ever goes tile-less again with no code change here, that is   │
 * │ almost certainly why — see MAP_TILE_URL's escape hatch below.            │
 * └──────────────────────────────────────────────────────────────────────────┘
 *
 * COMPLIANCE, AS FAR AS THIS CODEBASE CONTROLS IT:
 *   - The exact required URL, no subdomain sharding (a leftover from the
 *     CARTO days, which used `{s}` — OSM's policy asks for the one hostname).
 *   - Attribution rendered by Leaflet's own control (required, not optional).
 *   - `Referrer-Policy: strict-origin-when-cross-origin` in next.config.ts
 *     still sends a valid Referer (the origin), so it does not trip the
 *     policy's "do not strip Referer" rule.
 *   - No prefetching, no bulk requests: Leaflet only fetches tiles for the
 *     viewport actually on screen, which is what the policy asks for.
 * What this codebase CANNOT control: the real browser User-Agent sent by
 * each visitor. The policy accepts that for websites — see above.
 *
 * TO SWITCH TO A KEYED PROVIDER LATER (MapTiler, Stadia, CARTO with an
 * account this time — the operator's call if OSM's best-effort availability
 * ever becomes a problem in practice): set BOTH of these and rebuild —
 *
 *   NEXT_PUBLIC_MAP_TILE_URL=https://provider.example/{z}/{x}/{y}.png?key=…
 *   NEXT_PUBLIC_MAP_TILE_ATTRIBUTION=&copy; <a href="https://provider.example">Provider</a>
 *
 * — and add that host to the CSP `img-src` in next.config.ts, or the browser
 * blocks the tiles even after Next allows them (see the `remotePatterns`
 * note there). Get the exact URL template and attribution HTML from the
 * provider's own dashboard/docs, not by guessing at the pattern — that is
 * exactly what went wrong with CARTO's here.
 *
 * NEXT_PUBLIC_ — not a plain server-only variable — because Leaflet's
 * `<TileLayer>` runs entirely in the browser, so the URL has to be in the
 * client bundle. Not a leak: a tile key is a public, domain-restricted key by
 * design, never a secret the server alone should see. Baked in at BUILD
 * time; changing either needs a rebuild, not just a service restart.
 */
export const MAP_TILE_URL: string | null =
  process.env.NEXT_PUBLIC_MAP_TILE_URL ??
  "https://tile.openstreetmap.org/{z}/{x}/{y}.png";

export const MAP_TILE_ATTRIBUTION: string | null =
  process.env.NEXT_PUBLIC_MAP_TILE_ATTRIBUTION ??
  '&copy; <a href="https://www.davijara.uz">davijara</a>';

/** Matches essentially every tile provider; raise only if a configured one supports more. */
export const MAP_TILE_MAX_ZOOM = 19;
