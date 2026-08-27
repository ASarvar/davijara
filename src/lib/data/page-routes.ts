/*
  The routes an editor can fill in from the panel.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ WHY A REGISTRY RATHER THAN A DATABASE LOOKUP BY PATH.                    │
  │                                                                          │
  │ These 26 routes already exist as real files under app/[locale]/, each    │
  │ rendering <PlaceholderPage navKey="…"> because the navigation was built  │
  │ before the content was written (the legacy site pointed six of eight nav │
  │ items at href="#"; this project gave every one of them an honest page).  │
  │                                                                          │
  │ A page component knows its `navKey` but not its own URL — there is no    │
  │ server-side `usePathname`. This table supplies the missing half, so      │
  │ PlaceholderPage can ask the database "is there content for me?" without  │
  │ 26 files each having to be edited to tell it where they live.            │
  │                                                                          │
  │ WHEN YOU ADD A NEW PLACEHOLDER ROUTE, ADD IT HERE TOO. Forgetting is not │
  │ fatal — an unregistered navKey simply keeps showing the "being prepared" │
  │ placeholder and cannot be filled in from the panel, which is visible the │
  │ moment someone looks for it in the list. Regenerate the raw list with:   │
  │                                                                          │
  │   grep -rl PlaceholderPage 'src/app/[locale]'                            │
  └──────────────────────────────────────────────────────────────────────────┘

  `path` has NO leading slash and NO locale prefix. It is the part between
  `/uz/` and the end — which is what the database stores, what the catch-all
  route matches on, and what revalidatePath is rebuilt from.

  `group` is only for the panel's list, so 26 rows arrive sorted the way the
  site's own menu is rather than alphabetically.
*/

export type PageRoute = {
  /** Key in the `nav` message namespace. Also the route's identity here. */
  navKey: string;
  /** URL after the locale, no leading slash. */
  path: string;
  group: string;
};

export const PAGE_ROUTES: PageRoute[] = [
  { navKey: "auction", path: "e-auksion", group: "Portal" },
  { navKey: "services", path: "xizmatlar", group: "Portal" },
  { navKey: "loginFull", path: "kirish", group: "Portal" },

  { navKey: "apparatus", path: "markaz/markaziy-apparat", group: "Markaz" },
  {
    navKey: "territorial",
    path: "markaz/hududiy-boshqarmalar",
    group: "Markaz",
  },
  { navKey: "reception", path: "markaz/qabul-kunlari", group: "Markaz" },
  { navKey: "vacancies", path: "markaz/bosh-ish-orinlari", group: "Markaz" },
  {
    navKey: "anticorruption",
    path: "markaz/korrupsiyaga-qarshi",
    group: "Markaz",
  },

  { navKey: "leasing", path: "faoliyat/ijaraga-berish", group: "Faoliyat" },
  { navKey: "inventory", path: "faoliyat/xatlov", group: "Faoliyat" },
  { navKey: "faq", path: "faoliyat/savollar", group: "Faoliyat" },

  { navKey: "documentsMain", path: "hujjatlar", group: "Hujjatlar" },
  {
    navKey: "documentsDrafts",
    path: "hujjatlar/loyihalar",
    group: "Hujjatlar",
  },
  {
    navKey: "documentsInternal",
    path: "hujjatlar/idoraviy",
    group: "Hujjatlar",
  },
  {
    navKey: "documentsPrograms",
    path: "hujjatlar/dasturlar",
    group: "Hujjatlar",
  },
  {
    navKey: "documentsRepealed",
    path: "hujjatlar/kuchini-yoqotgan",
    group: "Hujjatlar",
  },

  {
    navKey: "decreePf154",
    path: "ochiq-malumotlar/farmon-pf-154",
    group: "Ochiq maʼlumotlar",
  },
  {
    navKey: "resolutionPq447",
    path: "ochiq-malumotlar/qaror-pq-447",
    group: "Ochiq maʼlumotlar",
  },
  {
    navKey: "report3299",
    path: "ochiq-malumotlar/qaror-3299",
    group: "Ochiq maʼlumotlar",
  },
  {
    navKey: "appeals",
    path: "ochiq-malumotlar/murojaatlar",
    group: "Ochiq maʼlumotlar",
  },

  {
    navKey: "newsUzbekistan",
    path: "yangiliklar/ozbekiston",
    group: "Yangiliklar",
  },
  {
    navKey: "newsStatements",
    path: "yangiliklar/bayonotlar",
    group: "Yangiliklar",
  },
  { navKey: "newsMedia", path: "yangiliklar/media", group: "Yangiliklar" },

  { navKey: "privacy", path: "maxfiylik", group: "Huquqiy" },
  { navKey: "terms", path: "shartlar", group: "Huquqiy" },
  { navKey: "sitemap", path: "sayt-xaritasi", group: "Huquqiy" },
];

const BY_NAV_KEY = new Map(PAGE_ROUTES.map((route) => [route.navKey, route]));

export function routeForNavKey(navKey: string): PageRoute | undefined {
  return BY_NAV_KEY.get(navKey);
}

/*
  Paths a custom page may NOT claim.

  A page created in the panel is served by the catch-all route, which only
  ever runs for a URL no real route matched — so a collision here is not a
  security problem, it is a page that saves successfully and then never
  appears, with nothing to say why. Refusing the path up front is the
  difference between an error and a mystery.

  First segments only: the whole subtree under each belongs to real routes.
*/
const RESERVED_FIRST_SEGMENTS = new Set([
  "obyektlar",
  "sotilgan-obyektlar",
  "statistika",
  "eng-kam-stavkalar",
  "imtiyozlar",
  "yangiliklar",
  "markaz",
  "hujjatlar",
  "faoliyat",
  "ochiq-malumotlar",
  "malumotlar",
  "xizmatlar",
  "e-auksion",
  "kirish",
  "maxfiylik",
  "shartlar",
  "sayt-xaritasi",
  "styleguide",
  "api",
  "admin",
  "_next",
]);

/** Why this path cannot be used for a NEW page, or null if it can. */
export function reservedPathReason(path: string): string | null {
  const first = path.split("/")[0] ?? "";
  if (RESERVED_FIRST_SEGMENTS.has(first)) {
    return `"${first}" bilan boshlanadigan manzillar saytning oʻz sahifalariga tegishli. Boshqa manzil tanlang.`;
  }
  return null;
}
