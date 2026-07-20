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
*/

export const regions: Region[] = [
  { slug: "toshkent-shahri", name: "Toshkent shahri", objectCount: 612, lat: 41.2995, lng: 69.2401 },
  { slug: "toshkent", name: "Toshkent viloyati", objectCount: 486, lat: 41.2213, lng: 69.6511 },
  { slug: "samarqand", name: "Samarqand viloyati", objectCount: 421, lat: 39.6542, lng: 66.9597 },
  { slug: "buxoro", name: "Buxoro viloyati", objectCount: 318, lat: 39.7747, lng: 64.4286 },
  { slug: "xorazm", name: "Xorazm viloyati", objectCount: 267, lat: 41.5544, lng: 60.6277 },
  { slug: "fargona", name: "Farg'ona viloyati", objectCount: 394, lat: 40.3864, lng: 71.7864 },
  { slug: "andijon", name: "Andijon viloyati", objectCount: 352, lat: 40.7821, lng: 72.3442 },
  { slug: "namangan", name: "Namangan viloyati", objectCount: 331, lat: 41.0011, lng: 71.6683 },
  { slug: "qashqadaryo", name: "Qashqadaryo viloyati", objectCount: 289, lat: 38.861, lng: 65.7847 },
  { slug: "surxondaryo", name: "Surxondaryo viloyati", objectCount: 243, lat: 37.9405, lng: 67.5708 },
  { slug: "jizzax", name: "Jizzax viloyati", objectCount: 198, lat: 40.1158, lng: 67.8422 },
  { slug: "sirdaryo", name: "Sirdaryo viloyati", objectCount: 176, lat: 40.8435, lng: 68.6618 },
  { slug: "navoiy", name: "Navoiy viloyati", objectCount: 214, lat: 40.0844, lng: 65.3792 },
  { slug: "qoraqalpogiston", name: "Qoraqalpog'iston Respublikasi", objectCount: 259, lat: 43.7944, lng: 59.0277 },
];
