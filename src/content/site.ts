import type { SocialPlatform } from "@/components/layout/social-links";

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
  operator: "Davlat mulki obyektlaridan samarali foydalanish markazi",
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
  phone: "(71) 259-22-70",
  phoneHref: "tel:1082",
  corporatePhone: "1082",
  corporatePhoneHref: "1082",
  hotline: "1082",
  hotlineHref: "tel:1082",
  email: "info@davijara.uz",
  emailHref: "mailto:info@davijara.uz",
  address: {
    postalCode: "100000",
    street: "Amir Temur shoh ko`chasi 6",
    city: "Toshkent shahri",
    country: "O'zbekiston",
    /** Rendered form used in the footer and JSON-LD. */
    full: "100000, Toshkent shahri, Amir Temur shoh ko`chasi, 6",
    /**
     * Where the map on /aloqa drops its pin. NULL UNTIL VERIFIED.
     *
     * Not guessed, and the reason is specific: OpenStreetMap has the street
     * — Buxoro ko'chasi runs through Mirobod tumani around 41.3100, 69.2713 —
     * but house number 6 is not mapped on it. Every result came back as a
     * street segment with no `house_number`, so the building is undetermined.
     *
     * A pin placed "somewhere along the right street" is worse than no pin:
     * it is a state portal telling a citizen which door to walk to, and being
     * wrong by a block. `<OfficeMap>` renders nothing while this is null, and
     * the address text beside it is correct either way.
     *
     * To enable: read the exact point off a map and paste it as
     * `{ lat: 41.xxxxxx, lng: 69.xxxxxx }`.
     */
    coords: { lat: 41.308820, lng: 69.2787344 } as { lat: number; lng: number } | null,
  },
  /** Reception hours, shown on /aloqa. */
  hours: {
    weekdays: "Dushanba — Juma, 9:00 — 18:00",
    lunch: "Tushlik: 13:30 — 14:30",
    weekend: "Shanba, Yakshanba — dam olish kunlari",
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
   * Literal label, already resolved for one locale.
   *
   * Only set on entries that come from the ADMIN PANEL, which have no key in
   * `messages/nav` to look up. Everything in `mainNav` below leaves this
   * undefined and is labelled by its `key` instead — that is what keeps the
   * menu item and the page it opens from ever disagreeing about their name.
   *
   * See lib/data/navigation.ts, which merges the two kinds into one tree.
   */
  label?: string;
  /**
   * Pages that live UNDER this one in the menu.
   *
   * One level only, and deliberately: a second level of nesting on a portal
   * this size is a menu the reader has to explore rather than read. The
   * parent is USUALLY a real link too — a page in its own right, not a
   * folder — so the submenu adds a way in without taking one away. `Faoliyat`
   * and `Hujjatlar` are the operator's named exceptions: see `clickable`.
   */
  children?: NavItem[];
  /**
   * Set to `false` to make a parent with children NON-navigable — hovering
   * or focusing it still opens the submenu, but there is no page for a click
   * or Enter to land on. Absent (the default) means the item is a real link,
   * same as every entry always was before the operator asked for these two
   * exceptions.
   *
   * Only meaningful on an item that HAS children; a childless entry has
   * nothing for the reader to reach except by clicking it, so this flag on
   * one would just be a dead menu entry.
   */
  clickable?: boolean;
}

/** External links keep a literal label; domain names are not translated. */
export interface ExternalNavItem {
  label: string;
  href: string;
}

/**
 * The Centre's social accounts, shown in the header's contact stack.
 *
 * `label` is the link's accessible name and its hover tooltip. Platform names
 * are proper nouns, so they are literals here rather than translation keys.
 */
export const socialLinks: Array<{
  platform: SocialPlatform;
  href: string;
  label: string;
}> = [
  { platform: "telegram", href: "https://t.me/davijara_uz", label: "Telegram" },
  { platform: "instagram", href: "https://instagram.com/davijarauz", label: "Instagram" },
  { platform: "facebook", href: "https://www.facebook.com/davijarauz/", label: "Facebook" },
];
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
 * Parents are USUALLY real pages too, never bare folders. Three are the
 * operator's named exceptions (see `clickable` on `NavItem`):
 *
 *   - `activity` ("Faoliyat"), `documentsSection` ("Hujjatlar") and `Data`
 *     ("Ma'lumotlar") open their submenu on hover/focus like every other
 *     parent, but carry `clickable: false` — there is no page for a click
 *     to land on, only a way in to their children. Their own `href` stays a
 *     real route (so direct navigation and active-state highlighting still
 *     work), it is simply never rendered as a link.
 *
 * `statistics` ("Statistika") used to be `Data`'s direct-click target and a
 * child of it; the operator asked for it to be its own top-level item
 * instead (2026-08-28), right after `home` — it no longer appears under
 * `Data` at all.
 */
export const mainNav: NavItem[] = [
  /*
    The logo already links home, and this row deliberately did not repeat it —
    but the logo is only recognisable as a link to people who know that
    convention, and on a state portal that is not everyone. Added at the
    operator's request, first and childless.
  */
  { key: "home", href: "/" },
  { key: "statistics", href: "/statistika" },
  {
    key: "centre",
    href: "/markaz",
    children: [
      { key: "about", href: "/markaz" },
      { key: "duties", href: "/markaz/vazifalar" },
      { key: "structure", href: "/markaz/tuzilma" },
      { key: "reception", href: "/markaz/rahbariyat" },
      { key: "apparatus", href: "/markaz/markaziy-apparat" },
      { key: "territorial", href: "/markaz/hududiy-boshqarmalar" },
      { key: "anticorruption", href: "/markaz/korrupsiyaga-qarshi" },
      { key: "vacancies", href: "/markaz/bosh-ish-orinlari" },
    ],
  },
  {
    key: "activity",
    href: "/faoliyat",
    // No page renders at /faoliyat any more — see the note above.
    clickable: false,
    children: [
      { key: "vacantObjects", href: "/ijaraga-obyektlar" },
      { key: "leasedObjects", href: "/sotilgan-obyektlar" },
      { key: "leasePrivileges", href: "/imtiyozlar" },
      { key: "faq", href: "/faoliyat/savollar" },
    ],
  },
  {
    key: "documentsSection",
    href: "/hujjatlar",
    // No page renders at /hujjatlar any more — see the note above.
    clickable: false,
    children: [
      { key: "documentsMain", href: "/hujjatlar" },
      { key: "documentsPrograms", href: "/hujjatlar/dasturlar" },
      { key: "documentsDrafts", href: "/hujjatlar/loyihalar" },
    ],
  },
  {
    key: "Data",
    href: "/malumotlar/ochiq-malumotlar",
    // No direct-click target any more — Statistika left as its own
    // top-level item. See the note above.
    clickable: false,
    children: [
      { key: "openData", href: "/malumotlar/ochiq-malumotlar" },
      { key: "minRates", href: "/eng-kam-stavkalar" },
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
    ],
  },
  { key: "contact", href: "/aloqa" },
];

/**
 * Condensed nav for the mobile bottom bar (ported from davijara-v2).
 * Five items is the practical ceiling before targets get too small.
 */
export const bottomNav: Array<NavItem & { icon: string }> = [
  // { key: "home", href: "/", icon: "Home" },
  // { key: "objects", href: "/ijaraga-obyektlar", icon: "Building2" },
  // // { key: "auction", href: "/e-auksion", icon: "Gavel" },
  // { key: "privileges", href: "/imtiyozlar", icon: "BadgePercent" },
  // // { key: "cabinet", href: "/kirish", icon: "User" },
];

export const footerNav: Array<{ heading: string; items: NavItem[] }> = [
  {
    heading: "Boʻlimlar",
    items: [
      { key: "objects", href: "/ijaraga-obyektlar" },
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
