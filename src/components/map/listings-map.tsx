"use client";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
import { Maximize2, Minimize2 } from "lucide-react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
/*
  Cluster positioning and the spiderfy leg lines. Imported from
  leaflet.markercluster itself (a direct dependency) rather than through
  react-leaflet-cluster, whose `/styles` subpath does not exist in 4.x.
  `MarkerCluster.Default.css` is deliberately NOT imported — it paints the
  plugin's green/yellow/red bubbles, and `clusterIcon` below replaces those
  with the brand ones.
*/
import "leaflet.markercluster/dist/MarkerCluster.css";

import { AuctionCountdown } from "@/components/common/auction-countdown";
import { LotImage } from "@/components/common/lot-image";
import { formatArea, formatDateTime, formatNumber } from "@/lib/format";
import {
  MAP_TILE_ATTRIBUTION,
  MAP_TILE_MAX_ZOOM,
  MAP_TILE_URL,
} from "@/lib/map-tiles";
import { auctionStarted, nextAuctionStart } from "@/lib/auction-phase";
import { withBasePath } from "@/lib/base-path";
import type { Listing } from "@/types/content";

/*
  Leaflet map of the lots.

  Dynamically imported with `ssr: false` (see objects-explorer.tsx): Leaflet
  touches `window` at module scope so it cannot be server-rendered, and this
  keeps the map bundle off every visit that never opens the map tab.

  Basemap is Carto "Voyager" — light, low-saturation, openly licensed, and
  rendered with attribution. A dark basemap was tried and rejected: near-black
  tiles inside an already-navy section read as a void, and street and place
  names became illegible. Against a light map the navy/gold pins are the most
  saturated thing on screen, which is what a property map wants.

  The legacy site pulled tiles from `{s}.google.com/vt/`, outside Google's
  terms. That is not restored.
*/

/** Uzbekistan, framed to fit the whole country — the empty-results view. */
const COUNTRY_CENTER: [number, number] = [41.3775, 64.5853];
const COUNTRY_ZOOM = 5.6;

/*
  Bounds for the fit-to-pins zoom in `FitToListings`.

  MIN is a floor: a national spread (or one lonely far region) used to let the
  automatic fit drop to zoom 4-ish, where the country is a smudge and the
  clustered pins are unreadable. Clamping up to 6 can push an outlying pin off
  the initial view — the right trade, since the reader pans to it rather than
  starting on a frame where nothing is legible. `mapApiLot` in
  lib/data/listings.ts now also drops pins outside the country, so genuine
  outliers should be rare; this is the backstop for a merely wide spread.

  MAX is the old `fitBounds` cap, unchanged: filtering to a single lot should
  not slam the map to street level.
*/
const MIN_FIT_ZOOM = 6;
const MAX_FIT_ZOOM = 12;

/*
  Pin drawn as inline SVG rather than Leaflet's default PNG: the default icon
  404s under a bundler unless its image assets are re-pointed, and this needs
  no extra request. Navy body, gold core — high contrast on the light basemap.
*/
const PIN_SVG = `
    <svg viewBox="0 0 24 32" width="26" height="34" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z"
            fill="#1a3a7c" stroke="#c8a96e" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4.5" fill="#c8a96e"/>
    </svg>`;

/*
  A lot whose auction is open today: the same pin, at the same size, in green.

  A LIVE PIN CANNOT BE A SHADE OF THE CROWD. Every other pin on this map is
  navy with a gold core, so a live lot drawn in gold — as the first version
  was — is exactly the colour the eye has already learned to skim past. Green
  is used nowhere else on the portal, which is what makes it legible here at
  a glance.

  SAME DIMENSIONS AS THE NAVY PIN, deliberately: the pins are a set, and one
  of them drawn larger reads as a different KIND of thing rather than as the
  same thing in a different state. What separates it instead is the colour,
  the core turning over between white and gold (globals.css), and the filled
  area tab — the white stroke lifts it off the beige streets underneath.
*/
const PIN_SVG_LIVE = `
    <svg viewBox="0 0 24 32" width="26" height="34" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z"
            fill="#0f7a3d" stroke="#ffffff" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4.5" fill="#ffffff"/>
    </svg>`;

/*
  The pin, with the lot's floor area on a tab above it.

  THE PIN ITSELF IS UNTOUCHED, and so is every number Leaflet positions it by
  — `iconSize`, `iconAnchor` and `popupAnchor` are the same values the plain
  marker always had. The label is absolutely positioned OUT of that box by CSS
  (`bottom: 100%` on `.listing-marker-label`), so it floats above the pin
  without moving the pin's tip off its coordinate or shifting the popup. Sizing
  the icon to include the label would have done both, and would have made the
  box as wide as the widest number.

  Area is the one figure worth reading before opening a lot: on this catalogue
  it ranges from a 1 m² ATM bay to a 1 000 m² hall, and it is what decides
  whether a lot is worth a click at all. Price would need a currency and four
  more digits per tab.

  ICONS ARE CACHED BY LABEL. A divIcon is plain HTML, so two lots of 60 m² can
  share one instance; the catalogue has ~1 150 pins and only a few hundred
  distinct areas, and rebuilding an icon per marker per render is wasted work
  on the one component that already has the most to do.
*/
const markerIcons = new Map<string, L.DivIcon>();

/*
  divIcon html is a STRING, so anything interpolated into it is markup. The
  area label is a formatted number, but `liveLabel` comes from messages/ and a
  future translator is not a reason to trust the path — escaped rather than
  resting on where today's value happens to come from.
*/
const ESCAPES: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
};
const escapeHtml = (s: string) => s.replace(/[&<>"]/g, (c) => ESCAPES[c]);

function markerIconFor(
  area: number,
  /** Bidding room open now — see useLiveLots and lib/data/live-auctions.ts. */
  live: boolean,
  /** "Savdo boshlandi", for the screen reader only: the ring is silent. */
  liveLabel: string,
): L.DivIcon {
  // Upstream sends 0 for a lot with no area recorded; a "0 m²" tab would be
  // noise on the map and a claim we cannot make.
  const label = area > 0 ? formatArea(area) : "";

  /*
    The cache key carries the live flag AND the label text: the same 60 m² lot
    is a different icon once its auction opens, and the label is translated, so
    keying on area alone would serve a Russian reader Uzbek markup after a
    locale switch.
  */
  const key = live ? `live:${liveLabel}:${label}` : label;
  const cached = markerIcons.get(key);
  if (cached) return cached;

  // The tab turns green with the pin, so the lot reads as live from the label
  // as well as from the pin under it.
  const tab = label
    ? `<span class="listing-marker-label${live ? " listing-marker-label-live" : ""}">` +
      `${label}</span>`
    : "";
  /*
    A pin Leaflet keyboard-focuses is something a screen reader lands on, so
    the state the colour and the blink show visually is also said in words.
  */
  const state = live
    ? `<span class="listing-marker-sr">${escapeHtml(liveLabel)}</span>`
    : "";

  /*
    One geometry for both states — the anchor is the pin's TIP, which is the
    point actually on the coordinate, and a live lot is not at a different
    place than an upcoming one.
  */
  const icon = L.divIcon({
    className: live ? "listing-marker listing-marker-live" : "listing-marker",
    html: live ? `${tab}${state}${PIN_SVG_LIVE}` : `${tab}${PIN_SVG}`,
    iconSize: [26, 34],
    iconAnchor: [13, 34],
    popupAnchor: [0, -34],
  });
  markerIcons.set(key, icon);
  return icon;
}

/**
 * Cluster bubble, sized by how many lots it holds.
 *
 * A CLUSTER CARRIES THE LIVE STATE UP. The map opens on the whole country,
 * where every pin is inside a bubble — so a live pin that only announces
 * itself once it is uncovered announces itself to nobody. If any lot folded
 * into this bubble has its auction open, the bubble takes the red edge and a
 * badge, and clicking through leads to the pin.
 */
function clusterIcon(cluster: {
  getChildCount: () => number;
  getAllChildMarkers: () => { options: { icon?: L.DivIcon | L.Icon } }[];
}) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 34 : count < 100 ? 42 : 50;
  const live = cluster
    .getAllChildMarkers()
    .some((marker) =>
      marker.options.icon?.options.className?.includes("listing-marker-live"),
    );

  return L.divIcon({
    html: `
      <div style="
        width:${size}px;height:${size}px;
        display:flex;align-items:center;justify-content:center;
        border-radius:9999px;
        background:#1a3a7c;
        border:2px solid ${live ? "#0f7a3d" : "#c8a96e"};
        color:${live ? "#ffffff" : "#e8d5a8"};
        font-size:${count < 100 ? 13 : 12}px;
        font-weight:600;
        box-shadow:0 2px 12px rgba(7,16,43,.35);
        transition:transform .2s ease-out;
      ">${count}</div>${
        live
          ? `<span class="listing-cluster-blip" aria-hidden="true"></span>`
          : ""
      }`,
    className: live
      ? "listing-cluster listing-cluster-live"
      : "listing-cluster",
    iconSize: L.point(size, size, true),
  });
}

/**
 * Keeps Leaflet's cached container size in step with the real element.
 *
 * Leaflet measures its container once on construction and caches the result.
 * Inside a tab panel that measurement can be taken while the panel is still
 * laying out, and the map then renders a thin strip of tiles into a
 * full-width box until something forces a re-measure. A ResizeObserver is the
 * reliable fix — it covers the tab switch, the browser window resize, and the
 * accessibility text-size control, none of which fire a `resize` on the map.
 */
function KeepSizeInSync() {
  const map = useMap();

  useEffect(() => {
    const container = map.getContainer();
    const observer = new ResizeObserver(() => {
      map.invalidateSize({ animate: false });
    });
    observer.observe(container);
    // Also correct the first frame, before any resize has happened.
    map.invalidateSize({ animate: false });
    return () => observer.disconnect();
  }, [map]);

  return null;
}

/*
  Module scope, not inline: useSyncExternalStore re-subscribes whenever the
  callback identity changes, and a fresh arrow on every render would tear the
  subscription down and set it up again each time.
*/
const subscribeToNothing = () => () => {};

/**
 * Fullscreen toggle.
 *
 * The map is the one thing on the page a reader may genuinely want the whole
 * screen for — a 26rem box showing 1 100+ clustered lots forces constant
 * zoom-and-pan, and clusters only break apart at zoom levels that box cannot
 * usefully hold.
 *
 * The element handed to the API is Leaflet's own container, not the wrapper
 * around it in objects-explorer. That keeps the whole feature inside this file
 * (no prop drilling, no ref threading), and it sidesteps the wrapper's
 * `rounded-*` + `overflow-hidden`: a fullscreen element is promoted to the
 * browser's top layer, where an ancestor's clipping no longer applies, so the
 * map fills the screen square-cornered without needing a `:fullscreen`
 * override to undo the radius.
 *
 * Feature-detected rather than assumed. `document.fullscreenEnabled` is false
 * on iOS Safari, which only ever allows `<video>` to go fullscreen — showing a
 * button there would give a dead control instead of an honest absence.
 *
 * Escape is handled by the browser; adding our own key listener would fight it.
 */
function FullscreenControl({
  labels,
}: {
  labels: { enter: string; exit: string };
}) {
  const map = useMap();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  /*
    `document` does not exist on the server, so the capability cannot simply be
    read during render. useSyncExternalStore is the sanctioned way to pull a
    value out of the platform: it takes a server snapshot (false) and a client
    snapshot, so React never renders one and hydrates the other.

    Not a `useState` + `useEffect` pair, which is the obvious shape and is
    wrong here — setting state from an effect body schedules a second render
    purely to learn something the first render could have known, and the
    project's React Compiler lint rejects it (react-hooks/set-state-in-effect).

    The subscribe callback is a no-op: `fullscreenEnabled` reflects permissions
    policy, which does not change over a page's lifetime.
  */
  const supported = useSyncExternalStore(
    subscribeToNothing,
    () => document.fullscreenEnabled === true,
    () => false,
  );

  useEffect(() => {
    const onChange = () => {
      setIsFullscreen(document.fullscreenElement === map.getContainer());
      /*
        Leaflet caches its container size, and neither entering nor leaving
        fullscreen fires a window `resize`. KeepSizeInSync's ResizeObserver
        does catch this, but it lands a frame later — re-measuring here as
        well removes the flash of stretched tiles on the way in.
      */
      map.invalidateSize({ animate: false });
    };

    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, [map]);

  // Without this the button sits on the map's drag surface: a click would
  // also reach Leaflet and register as a map interaction.
  useEffect(() => {
    const node = buttonRef.current;
    if (node) L.DomEvent.disableClickPropagation(node);
  }, [supported]);

  if (!supported) return null;

  const toggle = () => {
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    } else {
      // Rejects if the gesture is not trusted or a policy forbids it. There is
      // no useful recovery — the map simply stays inline.
      void map
        .getContainer()
        .requestFullscreen()
        .catch(() => {});
    }
  };

  const label = isFullscreen ? labels.exit : labels.enter;

  return (
    <button
      ref={buttonRef}
      type="button"
      onClick={toggle}
      title={label}
      aria-label={label}
      /*
        z above Leaflet's own chrome (panes 700, controls 800, corners 1000).
        Top-right is the one free corner: zoom sits top-left, attribution
        bottom-right.
      */
      className="absolute top-3 right-3 z-[1000] flex size-9 items-center justify-center rounded-md border border-[color:var(--color-gold)]/30 bg-[color:var(--color-)] text-[color:var(--color-gold-light)] shadow-md transition-colors duration-200 hover:bg-[color:var(--color-navy-mid)] hover:text-[color:var(--color-gold)] focus-visible:ring-2 focus-visible:ring-[color:var(--color-gold)] focus-visible:outline-none"
    >
      {isFullscreen ? (
        <Minimize2 aria-hidden="true" className="size-4" />
      ) : (
        <Maximize2 aria-hidden="true" className="size-4" />
      )}
    </button>
  );
}

/**
 * Ctrl (or ⌘) + wheel zooms; a bare wheel scrolls the page.
 *
 * A full-width map that swallows the wheel traps anyone trying to scroll past
 * it — they land on the map and the page stops moving. Requiring a modifier
 * is the convention Google and Apple Maps both use when embedded in a page.
 *
 * Leaflet has no built-in "modifier only" mode, so its handler is toggled
 * around the event: enabled while the modifier is held, disabled the instant
 * it is released. `onWheel` is registered non-passively because the modifier
 * case must call `preventDefault()` — otherwise Ctrl+wheel triggers the
 * browser's own page zoom instead.
 *
 * The guard lifts in fullscreen. Its entire justification is that a trapped
 * wheel stops the PAGE scrolling — in fullscreen there is no page behind the
 * map to scroll, so demanding a modifier there would be friction protecting
 * nothing.
 */
function ModifierWheelZoom({ hint }: { hint: string }) {
  const map = useMap();
  const overlayRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = map.getContainer();
    let hintTimer: ReturnType<typeof setTimeout> | undefined;

    /*
      The overlay is shown by writing `style.opacity` on the node directly
      rather than through React state.

      Two reasons. A wheel event fires dozens of times per gesture, and
      routing each one through setState would re-render the whole map subtree
      — every marker and cluster — purely to fade a label. And the visibility
      is transient UI chrome that no other component reads, so keeping it in
      React state buys nothing.
    */
    const setHint = (visible: boolean) => {
      const node = overlayRef.current;
      if (node) node.style.opacity = visible ? "1" : "0";
    };

    const isFullscreen = () => document.fullscreenElement === container;

    const onWheel = (e: WheelEvent) => {
      if (isFullscreen()) {
        map.scrollWheelZoom.enable();
        clearTimeout(hintTimer);
        setHint(false);
        return;
      }

      if (e.ctrlKey || e.metaKey) {
        // Stop the browser zooming the whole page instead.
        e.preventDefault();
        map.scrollWheelZoom.enable();
        clearTimeout(hintTimer);
        setHint(false);
      } else {
        map.scrollWheelZoom.disable();
        setHint(true);
        clearTimeout(hintTimer);
        hintTimer = setTimeout(() => setHint(false), 1400);
      }
    };

    // Releasing the modifier must re-arm the guard, or the map would keep
    // swallowing the wheel for the rest of the session — except in fullscreen,
    // where plain-wheel zoom is the intended behaviour.
    const onKeyUp = () => {
      if (!isFullscreen()) map.scrollWheelZoom.disable();
    };

    container.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keyup", onKeyUp);

    return () => {
      container.removeEventListener("wheel", onWheel);
      window.removeEventListener("keyup", onKeyUp);
      clearTimeout(hintTimer);
    };
  }, [map]);

  return (
    <div
      ref={overlayRef}
      aria-hidden="true"
      style={{ opacity: 0 }}
      className="pointer-events-none absolute inset-0 z-[500] flex items-center justify-center bg-[color:var(--color-navy)]/45 backdrop-blur-[1px] transition-opacity duration-200"
    >
      <span className="rounded-full border border-[color:var(--color-gold)]/40 bg-[color:var(--color-navy)] px-4 py-2 text-sm font-medium text-[color:var(--color-gold-light)] shadow-lg">
        {hint}
      </span>
    </div>
  );
}

/**
 * Refits the viewport whenever the filtered set changes, so filtering to one
 * region zooms to that region instead of leaving the reader on the whole
 * country hunting for pins.
 */
function FitToListings({ listings }: { listings: Listing[] }) {
  const map = useMap();
  const key = listings.map((l) => l.id).join(",");
  const isFirstFit = useRef(true);

  useEffect(() => {
    /*
      The first fit is instant; later ones animate.

      `flyToBounds` drives its easing from requestAnimationFrame, which is
      frozen while the page is in a background tab — so a page opened in a
      background tab could be left stranded mid-flight, showing a sliver of
      the country. An instant first fit always lands correctly; the animation
      is then pure polish on filter changes the user is present for.
    */
    const animate = !isFirstFit.current;
    isFirstFit.current = false;

    map.invalidateSize({ animate: false });

    if (listings.length === 0) {
      map.setView(COUNTRY_CENTER, COUNTRY_ZOOM, { animate });
      return;
    }

    const bounds = L.latLngBounds(listings.map((l) => [l.lat, l.lng]));

    /*
      `getBoundsZoom` + `setView` rather than `fitBounds`, so the zoom can be
      clamped BEFORE the view moves. `fitBounds` applies its own `maxZoom`
      internally but has no `minZoom`, and reading `map.getZoom()` to clamp
      afterwards is unreliable on an animated transition — Leaflet only writes
      the new `_zoom` when the animation ends.

      Tighter padding than the old 48px: on the national view 48px on every
      edge was a visible margin of empty country around the outermost pins.
    */
    const fitZoom = map.getBoundsZoom(bounds, false, L.point(24, 24));
    const zoom = Math.min(Math.max(fitZoom, MIN_FIT_ZOOM), MAX_FIT_ZOOM);
    map.setView(bounds.getCenter(), zoom, { animate, duration: 0.6 });
    // `key` is the dependency that actually matters; `map` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
}

/*
  A room turns over in minutes, so the list is re-read on the minute. Cheap:
  `/api/live-auctions` caches upstream for 30 seconds, and the response is a
  few dozen lot numbers.
*/
const LIVE_POLL_MS = 60_000;

/**
 * Lot numbers whose bidding room is open right now, as e-auksion reports
 * them — see lib/data/live-auctions.ts for why this is asked rather than
 * worked out from the auction date.
 *
 * STARTS EMPTY AND FAILS CLOSED. Nothing is marked live until the first
 * answer arrives, and a failed refresh leaves the previous answer standing
 * rather than clearing it — one bad response should not blink every pin.
 */
function useLiveLots(): ReadonlySet<string> {
  const [lots, setLots] = useState<ReadonlySet<string>>(() => new Set());

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await fetch(withBasePath("/api/live-auctions"), {
          cache: "no-store",
        });
        // 503 is the route saying "no answer" rather than "nobody is live".
        if (!res.ok) return;
        const data: unknown = await res.json();
        const rows =
          typeof data === "object" && data !== null && "lots" in data
            ? (data as { lots: unknown }).lots
            : null;
        if (!active || !Array.isArray(rows)) return;
        setLots(new Set(rows.map(String)));
      } catch {
        // Offline, or the reader navigated away mid-flight. Keep what we have.
      }
    };

    void load();
    const id = window.setInterval(() => void load(), LIVE_POLL_MS);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  return lots;
}

/**
 * Which lots' auction moment has already passed — for the countdown caption,
 * and nothing else. Whether bidding is still OPEN is `useLiveLots`' answer.
 *
 * WAKES AT THE BOUNDARY, NOT ON A TIMER. The catalogue carries ~1 150 pins; a
 * one-minute tick would re-render the whole cluster group 1 440 times a day to
 * learn that nothing had changed. The only moment this answer changes is when
 * an auction opens, so the effect sleeps until the nearest one — capped at an
 * hour, which also re-reads the clock after a laptop wakes from sleep.
 *
 * READING THE CLOCK IN THE INITIALISER IS SAFE HERE, and only here: this map
 * is loaded with `ssr: false` (see objects-explorer), so the component never
 * renders on the server and there is no hydration pass for a first value to
 * disagree with. AuctionCountdown, in the popup below, starts at null instead
 * — that one DOES render on the server.
 */
function useStartedAuctions(listings: Listing[]): ReadonlySet<string> {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    let next: number | null = null;
    for (const listing of listings) {
      const at = nextAuctionStart(listing.auctionDate, now);
      if (at != null && (next == null || at < next)) next = at;
    }
    if (next == null) return;

    const delay = Math.min(Math.max(next - Date.now() + 1000, 1000), 3_600_000);
    const id = window.setTimeout(() => setNow(Date.now()), delay);
    return () => window.clearTimeout(id);
  }, [listings, now]);

  return useMemo(() => {
    const started = new Set<string>();
    for (const listing of listings) {
      if (auctionStarted(listing.auctionDate, now)) started.add(listing.id);
    }
    return started;
  }, [listings, now]);
}

export function ListingsMap({
  listings,
  regionName,
  detailHref,
  labels,
}: {
  listings: Listing[];
  /** Resolves a region slug to its display name. */
  regionName: (slug: string) => string;
  /** Locale-prefixed link for a lot. */
  detailHref: (listing: Listing) => string;
  labels: {
    mock: string;
    details: string;
    lot: string;
    zoomHint: string;
    auctionCountdown: string;
    auctionStarted: string;
    liveView: string;
    fullscreenEnter: string;
    fullscreenExit: string;
  };
}) {
  const liveLots = useLiveLots();
  const started = useStartedAuctions(listings);
  const isLive = (listing: Listing) =>
    listing.lotNumber != null && liveLots.has(listing.lotNumber);

  return (
    <MapContainer
      center={COUNTRY_CENTER}
      zoom={COUNTRY_ZOOM}
      /*
        Set here too, not only on the conditional <TileLayer> below. Leaflet
        normally infers maxZoom from a tile layer at mount time; with none
        configured there is nothing to infer it from and the map throws "Map
        has no maxZoom specified" instead of mounting — found live, the
        moment lib/map-tiles.ts's fallback went from "wrong URL" to "no URL".
      */
      maxZoom={MAP_TILE_MAX_ZOOM}
      // Scroll-zoom off: the map sits mid-page, and hijacking the wheel traps
      // someone who is only trying to scroll past it.
      scrollWheelZoom={false}
      /*
        `--band`, not the literal #0d1e45 this was. Leaflet writes the value
        inline, so it beats any stylesheet rule — which meant a navy slab sat
        in the middle of the light theme wherever tiles had not arrived yet or
        the world was zoomed out past the edges. The token is that same
        navy-mid on the dark theme, so nothing changes there.
      */
      style={{ height: "100%", width: "100%", background: "var(--band)" }}
    >
      {/*
        Shared with the office map — see lib/map-tiles.ts for why there is no
        default source. Without one, the clusters render on the plain
        `--band` surface, which stays honest rather than looking broken.
      */}
      {MAP_TILE_URL && MAP_TILE_ATTRIBUTION ? (
        <TileLayer
          url={MAP_TILE_URL}
          attribution={MAP_TILE_ATTRIBUTION}
          maxZoom={MAP_TILE_MAX_ZOOM}
        />
      ) : null}

      <KeepSizeInSync />
      <ModifierWheelZoom hint={labels.zoomHint} />
      <FullscreenControl
        labels={{
          enter: labels.fullscreenEnter,
          exit: labels.fullscreenExit,
        }}
      />
      <FitToListings listings={listings} />

      {/*
        Clustering keeps the map readable as the catalogue grows: the mock set
        already overlaps heavily around region centres, and a live API
        returning thousands would be an unreadable mat of pins. Clicking a
        cluster zooms in; `spiderfy` fans out pins sharing a spot.
      */}
      <MarkerClusterGroup
        iconCreateFunction={clusterIcon}
        showCoverageOnHover={false}
        spiderfyOnMaxZoom
        maxClusterRadius={55}
        chunkedLoading
      >
        {listings.map((listing) => (
          <Marker
            key={listing.id}
            position={[listing.lat, listing.lng]}
            icon={markerIconFor(
              listing.area,
              isLive(listing),
              labels.auctionStarted,
            )}
          >
            <Popup>
              {/*
                Name across the top, then photograph left and figures right.

                The name spans the full width because it is the one field that
                has to be readable in one go — these are long official object
                names, and in a half-width column they wrap to six or seven
                lines and dictate the height of everything beside them.

                Two layouts, switched at `sm`, and the stacked one is not a
                nicety: the side-by-side row needs ~22rem, and the map is
                full-bleed on a phone, so at 375px a popup that wide has
                nowhere to sit — Leaflet would pan the map trying to fit it.
                Below `sm` the photo goes full width instead, which is the same
                information in the space that exists. The two popup widths that
                pair with this are in globals.css.

                EVERY block here carries its own padding, because
                `.leaflet-popup-content` is stripped to `margin: 0` (see
                globals.css). That is deliberate: it puts the spacing under
                this component's control instead of Leaflet's, so the photo can
                be inset by a different amount than the text beside it.
              */}
              <span className="block px-3.5 pt-3.5 pb-2.5 text-sm leading-snug font-semibold text-[#07102b]">
                {listing.title}
              </span>

              <div className="flex flex-col sm:flex-row">
                {/*
                  Inset and rounded rather than bleeding to the popup edge.

                  `px-3.5` matches the title above and the details beside it,
                  so the photo's left edge lines up with the text rather than
                  sitting on its own margin. `sm:pr-0` is the one asymmetry:
                  on the row, the gap to the right of the photo is already
                  supplied by the details column's own left padding, and adding
                  it here too would double it. Stacked below `sm` there is no
                  column beside it, so the right padding comes back.

                  The tint and the radius are on the INNER wrapper, never the
                  padded outer one — on the outer they paint the padding too,
                  which puts a grey band around the photo instead of sitting
                  behind it.
                */}
                <div className="w-full shrink-0 px-3.5 pb-3.5 sm:w-1/2 sm:self-stretch sm:pr-0">
                  <div className="h-full overflow-hidden rounded-[10px] bg-[#eef1f8]">
                    <LotImage
                      orderId={listing.isMock ? undefined : listing.orderId}
                      region={listing.region}
                      eager
                      className="block aspect-[16/10] w-full sm:aspect-auto sm:h-full sm:min-h-[10.5rem]"
                    />
                  </div>
                </div>

                {/* `min-w-0` so a long word wraps instead of forcing the row
                    wider than the popup. */}
                <span className="block min-w-0 flex-1 px-3.5 pt-1 pb-3.5 sm:pt-0">
                  <span className="block text-xs text-[#3d4a6b]">
                    {/* Same "0 m² is not a measurement" rule as the marker
                        icon above — see `markerIconFor`. */}
                    {listing.area > 0
                      ? `${regionName(listing.region)} · ${formatArea(listing.area)}`
                      : regionName(listing.region)}
                  </span>

                  {/*
                    `formatNumber`, not `formatSom` — full figure, same as
                    e-auksion's own lot pages ("1 095 412,50 UZS" there; whole
                    so'm here, no kopek precision a citizen has any use for).
                    One string expression, not two JSX children: split apart,
                    the space between the number and "so'm" was silently
                    dropped by the time it reached the DOM (see lot-card.tsx
                    for the same bug, found there first).
                  */}
                  <span className="mt-1.5 block text-sm font-semibold text-[#7d6229]">
                    {`${formatNumber(listing.pricePerYear)} so'm`}
                  </span>

                  {listing.lotNumber ? (
                    <span className="mt-0.5 block text-xs text-[#3d4a6b]">
                      {labels.lot} {listing.lotNumber}
                    </span>
                  ) : null}

                  {/*
                    Same live countdown as the homepage's LotCard. Mock and
                    fallback listings never carry `auctionDate` (see
                    content/listings-mock.ts), so this simply does not render
                    for them rather than fabricating a time for a sample
                    record.

                    Ticks on its own client-side clock; nothing here re-renders
                    the marker or the map to drive it.
                  */}
                  {listing.auctionDate ? (
                    <span className="mt-2 block">
                      {/*
                        The caption is a countdown label, so it goes once the
                        auction has opened: "Savdo boshlanishiga" above a line
                        reading "Savdo boshlandi" says the opposite of itself.
                        AuctionCountdown then stands alone as the statement.
                      */}
                      {started.has(listing.id) ? null : (
                        <span className="block text-xs text-[#3d4a6b]">
                          {labels.auctionCountdown}
                        </span>
                      )}
                      <AuctionCountdown
                        iso={listing.auctionDate}
                        fallback={formatDateTime(listing.auctionDate)}
                        startedLabel={labels.auctionStarted}
                        className="block text-sm font-semibold text-[#07102b] tabular-nums"
                      />
                    </span>
                  ) : null}

                  {listing.isMock ? (
                    <span className="mt-2 block text-xs text-[#3d4a6b] italic">
                      {labels.mock}
                    </span>
                  ) : (
                    <a
                      href={detailHref(listing)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-2.5 inline-block text-xs font-medium text-[#1a3a7c] underline"
                    >
                      {labels.details}
                    </a>
                  )}

                  {/*
                    The bidding room, styled exactly like the offer link above
                    it: two links to the same site, one under the other, and
                    the second dressed differently read as a different kind of
                    thing. Which lots show it is the distinction that matters,
                    and the pin already carries that.

                    ONLY while e-auksion lists the lot's room as open —
                    lib/data/live-auctions.ts carries why that list is read
                    rather than worked out here. Withheld for mock records,
                    which have no lot behind them, and for lots upstream sent
                    with no number.
                  */}
                  {!listing.isMock &&
                  listing.liveAuctionUrl &&
                  isLive(listing) ? (
                    <a
                      href={listing.liveAuctionUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-1.5 inline-block text-xs font-medium text-[#1a3a7c] underline"
                    >
                      {labels.liveView}
                    </a>
                  ) : null}
                </span>
              </div>
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
