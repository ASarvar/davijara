"use client";

import { useEffect, useRef } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import MarkerClusterGroup from "react-leaflet-cluster";
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

import { formatArea, formatSom } from "@/lib/format";
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

/** Uzbekistan, framed to fit the whole country. */
const COUNTRY_CENTER: [number, number] = [41.3775, 64.5853];
const COUNTRY_ZOOM = 5.6;

/*
  Pin drawn as inline SVG rather than Leaflet's default PNG: the default icon
  404s under a bundler unless its image assets are re-pointed, and this needs
  no extra request. Navy body, gold core — high contrast on the light basemap.
*/
const markerIcon = L.divIcon({
  className: "listing-marker",
  html: `
    <svg viewBox="0 0 24 32" width="26" height="34" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z"
            fill="#07102b" stroke="#c8a96e" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4.5" fill="#c8a96e"/>
    </svg>`,
  iconSize: [26, 34],
  iconAnchor: [13, 34],
  popupAnchor: [0, -34],
});

/** Cluster bubble, sized by how many lots it holds. */
function clusterIcon(cluster: { getChildCount: () => number }) {
  const count = cluster.getChildCount();
  const size = count < 10 ? 34 : count < 100 ? 42 : 50;

  return L.divIcon({
    html: `
      <div style="
        width:${size}px;height:${size}px;
        display:flex;align-items:center;justify-content:center;
        border-radius:9999px;
        background:#07102b;
        border:2px solid #c8a96e;
        color:#e8d5a8;
        font-size:${count < 100 ? 13 : 12}px;
        font-weight:600;
        box-shadow:0 2px 12px rgba(7,16,43,.35);
        transition:transform .2s ease-out;
      ">${count}</div>`,
    className: "listing-cluster",
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

    const onWheel = (e: WheelEvent) => {
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
    // swallowing the wheel for the rest of the session.
    const onKeyUp = () => map.scrollWheelZoom.disable();

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
      <span className="bg-[color:var(--color-navy)] text-[color:var(--color-gold-light)] rounded-full border border-[color:var(--color-gold)]/40 px-4 py-2 text-sm font-medium shadow-lg">
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
    map.fitBounds(bounds, {
      padding: [48, 48],
      maxZoom: 12,
      animate,
      duration: 0.6,
    });
    // `key` is the dependency that actually matters; `map` is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return null;
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
  labels: { mock: string; details: string; lot: string; zoomHint: string };
}) {
  return (
    <MapContainer
      center={COUNTRY_CENTER}
      zoom={COUNTRY_ZOOM}
      // Scroll-zoom off: the map sits mid-page, and hijacking the wheel traps
      // someone who is only trying to scroll past it.
      scrollWheelZoom={false}
      style={{ height: "100%", width: "100%", background: "#0d1e45" }}
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />

      <KeepSizeInSync />
      <ModifierWheelZoom hint={labels.zoomHint} />
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
            icon={markerIcon}
          >
            <Popup>
              <span className="block text-sm leading-snug font-semibold text-[#07102b]">
                {listing.title}
              </span>
              <span className="mt-1 block text-xs text-[#3d4a6b]">
                {regionName(listing.region)} · {formatArea(listing.area)}
              </span>
              <span className="mt-1.5 block text-sm font-semibold text-[#7d6229]">
                {formatSom(listing.pricePerYear)}
              </span>
              {listing.lotNumber ? (
                <span className="mt-0.5 block text-xs text-[#3d4a6b]">
                  {labels.lot} {listing.lotNumber}
                </span>
              ) : null}
              {listing.isMock ? (
                <span className="mt-1.5 block text-xs text-[#3d4a6b] italic">
                  {labels.mock}
                </span>
              ) : (
                <a
                  href={detailHref(listing)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-xs font-medium text-[#1a3a7c] underline"
                >
                  {labels.details}
                </a>
              )}
            </Popup>
          </Marker>
        ))}
      </MarkerClusterGroup>
    </MapContainer>
  );
}
