"use client";

import dynamic from "next/dynamic";
import { useTranslations } from "next-intl";

/**
 * Client wrapper that loads `<OfficeMap>` in the browser only.
 *
 * THIS FILE EXISTS FOR ONE REASON: `dynamic(..., { ssr: false })` is not
 * allowed inside a Server Component — Next refuses it outright, with
 * "`ssr: false` is not allowed with `next/dynamic` in Server Components".
 * /aloqa is a Server Component, so the call has to live behind a `"use
 * client"` boundary, and this is the smallest one that will hold it. The
 * catalogue does the same thing; there the boundary happens to be
 * `objects-explorer`, which is a client component for its own reasons.
 *
 * And `ssr: false` itself is not optional: Leaflet touches `window` at module
 * scope, so merely marking the map `"use client"` is not enough — Next would
 * still render it once on the server and throw. Skipping SSR also keeps
 * Leaflet and its stylesheet, ~150KB, off every other page on the site.
 */
/*
  Its own component because `dynamic()` is called at MODULE scope, where no
  hook can run — `loading` takes a component, so the translation lookup moves
  inside one.
*/
function MapLoading() {
  const t = useTranslations("common");
  return (
    <div className="bg-secondary text-muted-foreground flex h-full w-full items-center justify-center text-sm">
      {t("mapLoading")}
    </div>
  );
}

const OfficeMap = dynamic(
  () => import("./office-map").then((m) => m.OfficeMap),
  { ssr: false, loading: MapLoading },
);

export function OfficeMapPanel({
  lat,
  lng,
  label,
}: {
  lat: number;
  lng: number;
  label: string;
}) {
  return <OfficeMap lat={lat} lng={lng} label={label} />;
}
