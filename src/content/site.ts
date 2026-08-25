/**
 * Single source of truth for organisation identity, navigation and footer.
 *
 * The legacy pages each hand-maintained their own copy of the chrome and had
 * drifted apart — index.html and imtiyozlar.html disagreed on the street
 * address and shipped two different "useful links" lists. Everything lives
 * here now so the pages cannot diverge again.
 */

export const site = {
  name: "Davijara.uz",
  shortName: "Davijara",
  operator: "Davlat mulki obyektlaridan foydalanish markazi",
  tagline: "Davlat mulkini ijaraga berish yagona portali",
  description:
    "Davlat mulki obyektlarini ijaraga olish bo'yicha yagona portal: bo'sh obyektlarni qidirish, E-auksion savdolari, ijara imtiyozlari va onlayn shartnoma rasmiylashtirish.",
  /*
    Must be the real origin in production — canonical URLs, hreflang
    alternates, the sitemap and OG image resolution all derive from it. Falls
    back to the production domain so a missing env var can't emit localhost
    URLs into a build.
  */
  url: process.env.NEXT_PUBLIC_SITE_URL ?? "https://davijara.uz",
} as const;

export const contacts = {
  phone: "+998(71)259-20-64",
  phoneHref: "tel:+998712592064",
  corporatePhone: "+998(71)259-20-64",
  corporatePhoneHref: "tel:+998712592064",
  hotline: "1082",
  hotlineHref: "tel:1082",
  email: "info@davijara.uz",
  emailHref: "mailto:info@davijara.uz",
  address: {
    postalCode: "100006",
    street: "Buxoro ko'chasi 6",
    city: "Toshkent sh.",
    country: "O'zbekiston",
    /** Rendered form used in the footer and JSON-LD. */
    full: "100006, Toshkent sh., Buxoro ko'chasi 6",
  },
} as const;

/**
 * Nav entries carry a translation KEY, not a label — labels live in
 * messages/*.json under the `nav` namespace so they localise. Components
 * resolve them with `t(item.key)`.
 */
export interface NavItem {
  key: string;
  href: string;
  /**
   * Pages that live UNDER this one in the menu.
   *
   * One level only, and deliberately: a second level of nesting on a portal
   * this size is a menu the reader has to explore rather than read. The
   * parent stays a real link — it is a page in its own right, not a folder —
   * so the submenu adds a way in without taking one away.
   */
  children?: NavItem[];
}

/** External links keep a literal label; domain names are not translated. */
export interface ExternalNavItem {
  label: string;
  href: string;
}

/**
 * The six institutional sections, in the operator's own order.
 *
 * SHAPED BY THE OPERATOR, not by traffic. This is the standard Uzbek state
 * portal information architecture — the organisation first, its activity
 * second, then documents, open data, news and contact — and a citizen who has
 * used any other ministry site meets the structure they already know.
 *
 * WHAT THAT COSTS, recorded here so it is a decision rather than an accident:
 * the catalogue (`/obyektlar`) is the portal's primary service and it now sits
 * one level down, under "Faoliyat". The homepage search panel is therefore the
 * main way in and must stay above the fold; if that panel ever moves, this
 * trade needs revisiting.
 *
 * EVERY href IS A REAL ROUTE. The legacy site pointed six of eight nav items
 * at `href="#"`; nothing here may do that. Pages with no content yet render
 * `PlaceholderPage`, so the structure is honest and each one is replaced
 * independently as content arrives.
 *
 * Parents are real pages too, never bare folders — `/faoliyat` and
 * `/ochiq-malumotlar` render a section index listing their own children, so a
 * reader who clicks the section header lands somewhere useful instead of on a
 * dead end. The other four parents already had a natural own-page.
 */
export const mainNav: NavItem[] = [
  {
    key: "centre",
    href: "/markaz",
    children: [
      { key: "about", href: "/markaz" },
      { key: "duties", href: "/markaz/vazifalar" },
      { key: "structure", href: "/markaz/tuzilma" },
      { key: "reception", href: "/markaz/qabul-kunlari" },
      { key: "anticorruption", href: "/markaz/korrupsiyaga-qarshi" },
      { key: "territorial", href: "/markaz/hududiy-boshqarmalar" },
      { key: "apparatus", href: "/markaz/markaziy-apparat" },
      { key: "vacancies", href: "/markaz/bosh-ish-orinlari" },
    ],
  },
  {
    key: "activity",
    href: "/faoliyat",
    children: [
      { key: "inventory", href: "/faoliyat/xatlov" },
      // The catalogue and the results list, under the names this menu gives
      // them. Both are long-standing routes; only the label is new.
      { key: "vacantObjects", href: "/obyektlar" },
      { key: "leasing", href: "/faoliyat/ijaraga-berish" },
      { key: "leasedObjects", href: "/sotilgan-obyektlar" },
      { key: "leasePrivileges", href: "/imtiyozlar" },
      { key: "faq", href: "/faoliyat/savollar" },
    ],
  },
  {
    key: "documentsSection",
    href: "/hujjatlar",
    children: [
      { key: "documentsMain", href: "/hujjatlar" },
      { key: "documentsInternal", href: "/hujjatlar/idoraviy" },
      { key: "documentsRepealed", href: "/hujjatlar/kuchini-yoqotgan" },
      { key: "documentsPrograms", href: "/hujjatlar/dasturlar" },
      { key: "documentsDrafts", href: "/hujjatlar/loyihalar" },
    ],
  },
  {
    key: "openData",
    href: "/ochiq-malumotlar",
    children: [
      { key: "report3299", href: "/ochiq-malumotlar/qaror-3299" },
      { key: "decreePf154", href: "/ochiq-malumotlar/farmon-pf-154" },
      { key: "resolutionPq447", href: "/ochiq-malumotlar/qaror-pq-447" },
      { key: "statistics", href: "/statistika" },
      { key: "appeals", href: "/ochiq-malumotlar/murojaatlar" },
    ],
  },
  {
    key: "news",
    href: "/yangiliklar",
    children: [
      { key: "newsCentre", href: "/yangiliklar" },
      { key: "newsUzbekistan", href: "/yangiliklar/ozbekiston" },
      { key: "newsStatements", href: "/yangiliklar/bayonotlar" },
      { key: "newsMedia", href: "/yangiliklar/media" },
    ],
  },
  { key: "contact", href: "/aloqa" },
];

/**
 * Condensed nav for the mobile bottom bar (ported from davijara-v2).
 * Five items is the practical ceiling before targets get too small.
 */
export const bottomNav: Array<NavItem & { icon: string }> = [
  { key: "home", href: "/", icon: "Home" },
  { key: "objects", href: "/obyektlar", icon: "Building2" },
  { key: "auction", href: "/e-auksion", icon: "Gavel" },
  { key: "privileges", href: "/imtiyozlar", icon: "BadgePercent" },
  { key: "cabinet", href: "/kirish", icon: "User" },
];

export const footerNav: Array<{ heading: string; items: NavItem[] }> = [
  {
    heading: "Portal",
    items: [
      { key: "objects", href: "/obyektlar" },
      { key: "auction", href: "/e-auksion" },
      { key: "privileges", href: "/imtiyozlar" },
      // { key: "services", href: "/xizmatlar" },
      { key: "documents", href: "/hujjatlar" },
      { key: "news", href: "/yangiliklar" },
    ],
  },
];

export const externalLinks: { heading: string; items: ExternalNavItem[] } = {
  /*
      Reconciled from the two legacy footers, which listed different sets.
      Kept: the domains that resolve to real Uzbek state platforms.
      Dropped: "online-yanki.uz" (appears in imtiyozlar.html only, does not
      resolve, and reads as a corruption of "online-ijara.uz").
      Normalised: "e-auktsion.uz" -> "e-auksion.uz" (the spelling used in the
      live lot links elsewhere in the legacy markup).
    */
  heading: "Foydali havolalar",
  items: [
    { label: "my.gov.uz", href: "https://my.gov.uz" },
    { label: "davaktiv.uz", href: "https://davaktiv.uz" },
    { label: "e-auksion.uz", href: "https://e-auksion.uz" },
    { label: "lex.uz", href: "https://lex.uz" },
    { label: "online-ijara.uz", href: "https://online-ijara.uz" },
  ],
};

export const legalNav: ExternalNavItem[] = [
  { label: "Maxfiylik siyosati", href: "/maxfiylik" },
  { label: "Foydalanish shartlari", href: "/shartlar" },
  { label: "Sayt xaritasi", href: "/sayt-xaritasi" },
];

/** Domains referenced above; used for JSON-LD `sameAs`. */
export const relatedPlatforms = [
  "https://my.gov.uz",
  "https://davaktiv.uz",
  "https://e-auksion.uz",
  "https://lex.uz",
  "https://online-ijara.uz",
];
