import type { Region } from "@/types/content";

/*
  The 14 administrative regions of Uzbekistan.

  Ported from the Leaflet block in legacy/index.html, with two corrections:

  1. The legacy array held only 13 entries — Toshkent shahri (the capital, an
     administrative region in its own right) was missing, even though the hero
     copy claims "14 hudud bo'yicha xizmat". Added here.
  2. The legacy map picked 7 of these at random on every page load
     (`getRandomViloyatlar`), so the markers moved on each refresh. Order and
     membership are fixed now; nothing about the map is randomised.

  `objectCount` is illustrative until the listings API is connected — it is
  read through lib/data/regions.ts so a live count can replace it in one place.

  ── `apiId` ──────────────────────────────────────────────────────────────
  The auction service takes a numeric region id and REQUIRES it: there is no
  "all regions" call, so every one of these has to be right or that region is
  simply invisible on the map.

  These are the standard SOATO region codes (1703 Andijon, 1706 Buxoro …
  1735 Qoraqalpog'iston), so they are a published national identifier rather
  than an internal sequence of this one service — which is why they are safe
  to rely on.

  Each was still read back from the service itself before being written here:
  the response carries `summary.name`, so every id is confirmed against the
  name the service gives it. Note the numbering has gaps (1716, 1720 …) — the
  codes are assigned, not consecutive, so never infer a missing id by counting.
*/

export const regions: Region[] = [
  { slug: "qoraqalpogiston", name: "Qoraqalpog'iston Respublikasi", apiId: 1735, objectCount: 259, lat: 43.7944, lng: 59.0277 },
  { slug: "andijon", name: "Andijon viloyati", apiId: 1703, objectCount: 352, lat: 40.7821, lng: 72.3442 },
  { slug: "buxoro", name: "Buxoro viloyati", apiId: 1706, objectCount: 318, lat: 39.7747, lng: 64.4286 },
  { slug: "jizzax", name: "Jizzax viloyati", apiId: 1708, objectCount: 198, lat: 40.1158, lng: 67.8422 },
  { slug: "qashqadaryo", name: "Qashqadaryo viloyati", apiId: 1710, objectCount: 289, lat: 38.861, lng: 65.7847 },
  { slug: "navoiy", name: "Navoiy viloyati", apiId: 1712, objectCount: 214, lat: 40.0844, lng: 65.3792 },
  { slug: "namangan", name: "Namangan viloyati", apiId: 1714, objectCount: 331, lat: 41.0011, lng: 71.6683 },
  { slug: "samarqand", name: "Samarqand viloyati", apiId: 1718, objectCount: 421, lat: 39.6542, lng: 66.9597 },
  { slug: "surxondaryo", name: "Surxondaryo viloyati", apiId: 1722, objectCount: 243, lat: 37.9405, lng: 67.5708 },
  { slug: "sirdaryo", name: "Sirdaryo viloyati", apiId: 1724, objectCount: 176, lat: 40.8435, lng: 68.6618 },
  { slug: "toshkent", name: "Toshkent viloyati", apiId: 1727, objectCount: 486, lat: 41.2213, lng: 69.6511 },
  { slug: "fargona", name: "Farg'ona viloyati", apiId: 1730, objectCount: 394, lat: 40.3864, lng: 71.7864 },
  { slug: "xorazm", name: "Xorazm viloyati", apiId: 1733, objectCount: 267, lat: 41.5544, lng: 60.6277 },
  { slug: "toshkent-shahri", name: "Toshkent shahri", apiId: 1726, objectCount: 612, lat: 41.2995, lng: 69.2401 },
];
