"use client";

import L from "leaflet";
import { MapContainer, Marker, TileLayer } from "react-leaflet";

import "leaflet/dist/leaflet.css";

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
        CARTO Voyager over OpenStreetMap data — the same basemap the catalogue
        uses, so the two maps on the site do not look like two different
        products. Attribution is required by both licences and is rendered by
        Leaflet's own control.
      */}
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> &copy; <a href="https://carto.com/attributions">CARTO</a>'
        maxZoom={19}
      />
      <Marker position={[lat, lng]} icon={PIN} title={label} alt={label} />
    </MapContainer>
  );
}
