"use client";

import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

import {
  MAP_TILE_ATTRIBUTION,
  MAP_TILE_MAX_ZOOM,
  MAP_TILE_URL,
} from "@/lib/map-tiles";

/**
 * The Centre's own address, as one pin.
 *
 * A separate component from `ListingsMap` rather than a mode of it. That one
 * carries clustering, fit-to-bounds, popups, a fullscreen control and a
 * modifier-wheel-zoom guard for ~1 150 markers; none of it applies to a single
 * fixed point, and importing `leaflet.markercluster` onto the contact page
 * would ship that machinery to render one marker.
 *
 * ONLY RENDERED WHEN THE COORDINATE IS KNOWN — see `contacts.address.coords`
 * in content/site.ts for why it starts null and must not be guessed.
 */

/*
  The same pin as the catalogue's, minus the floor-area tab: navy body, gold
  ring, gold centre. Built once at module scope — there is exactly one marker
  on this map, so there is nothing to cache and nothing to vary.
*/
const PIN = L.divIcon({
  className: "office-marker",
  html: `
    <svg viewBox="0 0 24 32" width="34" height="45" aria-hidden="true">
      <path d="M12 0C5.4 0 0 5.4 0 12c0 9 12 20 12 20s12-11 12-20c0-6.6-5.4-12-12-12z"
            fill="#1a3a7c" stroke="#c8a96e" stroke-width="1.5"/>
      <circle cx="12" cy="12" r="4.5" fill="#c8a96e"/>
    </svg>`,
  iconSize: [34, 45],
  iconAnchor: [17, 45],
});

export function OfficeMap({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  /** The marker's accessible name — the postal address. */
  label: string;
}) {
  return (
    <MapContainer
      center={[lat, lng]}
      zoom={17}
      /*
        Set here too, not only on the conditional <TileLayer> below. Leaflet
        normally infers maxZoom from a tile layer at mount time, and with none
        configured there is nothing to infer it from — the map throws "Map
        has no maxZoom specified" and never mounts at all. Found live: the pin
        disappeared along with the tiles the moment the fallback in
        lib/map-tiles.ts went from "wrong URL" to "no URL".
      */
      maxZoom={MAP_TILE_MAX_ZOOM}
      /*
        Off, deliberately. A map that swallows the wheel traps a reader who is
        only trying to scroll past it — and unlike the catalogue's map, there
        is nothing here to explore by zooming: one building, already centred.
        Drag and the +/- controls still work.
      */
      scrollWheelZoom={false}
      /*
        `--band`, not a literal navy. Leaflet writes this inline, so it beats
        any stylesheet rule — a hardcoded colour would put a navy slab in the
        middle of the light theme wherever tiles have not arrived yet.
      */
      style={{ height: "100%", width: "100%", background: "var(--band)" }}
    >
      {/*
        NO DEFAULT TILE SOURCE — see lib/map-tiles.ts for why. Rendered only
        once an operator supplies a real, licensed provider; until then the
        pin sits on the plain `--band` surface above, which is an honest
        degraded state rather than a broken-looking one.
      */}
      {MAP_TILE_URL && MAP_TILE_ATTRIBUTION ? (
        <TileLayer
          url={MAP_TILE_URL}
          attribution={MAP_TILE_ATTRIBUTION}
          maxZoom={MAP_TILE_MAX_ZOOM}
        />
      ) : null}
      <Marker position={[lat, lng]} icon={PIN} title={label} alt={label} />
    </MapContainer>
  );
}
