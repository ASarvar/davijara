import type {
  DocItem,
  Listing,
  Service,
  Stat,
  Step,
} from "@/types/content";

/*
  Homepage content, lifted out of legacy/index.html.

  Obvious typos in the marketing copy have been corrected (the legacy text had
  "tayyor emissizmi?" for "emasmisiz", "so'lovini" for "to'lovini", and a news
  excerpt that was largely unparseable). Statutory text is NOT edited anywhere
  in this project — see src/content/privileges.ts.
*/

/*
  THE YEAR IS NOT IN THESE LABELS ANY MORE. It is printed once, beside the
  section heading, because all four cards count the same year and repeating
  it four times said nothing the heading could not say once. `getHeroStats`
  returns that year for the heading to use.
*/
export const heroStats: Stat[] = [
  {
    value: "1 390+",
    label: "Ijaraga berilayotgan obyektlar",
    icon: "Building2",
  },
  {
    value: "28 075",
    label: "Tuzilgan ijara shartnomalari",
    icon: "FileText",
  },
  /*
    The unit is a FIELD, not part of the label, because the scale of this
    figure changes by three orders of magnitude between the republic (148,8
    mln m²) and a single tuman (30,0 ming m²). Pinned to "mln m²" the card read
    "0" for most districts. The static value below is the operator's, in
    millions; the live path picks the unit to match the number — see
    `formatLeasedArea`.
  */
  {
    value: "145,9",
    label: "Ijaraga berilgan maydon",
    unit: "mln m²",
    icon: "LandPlot",
  },
  /*
    The only card here with no static figure: its value is computed from the
    live service every time (see `getSoldCount`), so there is nothing verified
    to fall back to and `getHeroStats` drops the card entirely when the
    service cannot answer.

    Unlike the two above — operator-reported totals for 2026 specifically,
    replaced by hand when 2027's arrive — this one recounts itself from the
    live service every year.
  */
  {
    value: "",
    label: "Ijaraga berilgan obyektlar",
    icon: "Handshake",
  },
];

export const impactStats: Stat[] = [
  { value: "469,9 mlrd", label: "soʻm — 2026 yilgi ijara toʻlovlari" },
  { value: "98%", label: "Elektron shaklda tuzilgan shartnomalar" },
  { value: "3 kun", label: "Obyektni savdoga chiqarish oʻrtacha muddati" },
  { value: "24/7", label: "Vebsayt orqali xizmatlardan foydalanish" },
];

export const steps: Step[] = [
  {
    number: "01",
    title: "Obyektni tanlang",
    description:
      "davijar.uz saytida hudud, maydon va narx boʻyicha oʻzingizga kerakli obyektni toping.",
    icon: "MapPin",
  },
  {
    number: "02",
    title: "Auksionda qatnashing",
    description: "«E-auksion» savdo platformasida onlayn savdoda ishtirok eting.",
    icon: "Gavel",
  },
  {
    number: "03",
    title: "Shartnoma tuzing",
    description:
      "Gʻolib deb topilgach, ijara shartnomasini elektron raqamli imzo bilan imzolang.",
    icon: "FileText",
  },
  {
    number: "04",
    title: "Toʻlovni amalga oshiring",
    description:
      "Ijara toʻlovlarini elektron toʻlov tizimlari orqali toʻlang.",
    icon: "CircleCheck",
  },
];

export const services: Service[] = [
  {
    slug: "kalkulyator",
    title: "Ijara kalkulatori",
    description:
      "Obyekt maydoni va joylashuviga koʻra taxminiy ijara toʻlovini hisoblang.",
    icon: "Calculator",
    href: "/xizmatlar/kalkulyator",
  },
  {
    slug: "stavkalar",
    title: "Eng kam stavkalar",
    description:
      "Hudud boʻyicha 1 m² uchun belgilangan eng kam ijara narxlarini koʻring.",
    icon: "TrendingDown",
    href: "/xizmatlar/stavkalar",
  },
  {
    slug: "ariza",
    title: "Ariza yuborish",
    description:
      "Obyektni ijaraga chiqarish boʻyicha taklifni onlayn tartibda yuboring.",
    icon: "Send",
    href: "/xizmatlar/ariza",
  },
  {
    slug: "shartnoma",
    title: "Shartnoma holati",
    description:
      "Ijara shartnomangiz va toʻlovlar holatini raqam boʻyicha kuzating.",
    icon: "FileSearch",
    href: "/xizmatlar/shartnoma",
  },
];

/** Teaser cards linking into the imtiyozlar page, one per category. */
export const privilegeCategories = [
  {
    category: "ijtimoiy" as const,
    title: "Ijtimoiy himoya guruhlari",
    description:
      "Ayollar, yoshlar va nogironligi boʻlgan shaxslar ishtirokidagi tadbirkorlik subyektlari uchun ijara toʻlovidan 50–100% gacha chegirma.",
    icon: "Heart",
  },
  {
    category: "talim" as const,
    title: "Ta'lim va tarbiya muassasalari",
    description:
      "Xususiy oʻquv markazlari, kasb-hunar kolleji binolari va bolalar bogʻchalari uchun bepul yoki yengillashtirilgan ijara sharoiti.",
    icon: "GraduationCap",
  },
  {
    category: "it" as const,
    title: "IT va innovatsion loyihalar",
    description:
      "IT-park hamda raqamli texnologiyalar sohasidagi korxonalar uchun boʻsh davlat obyektlaridan bepul foydalanish huquqi.",
    icon: "Cpu",
  },
  {
    category: "boshqa" as const,
    title: "Sport, hunarmandchilik va hududlar",
    description:
      "Sportchi-murabbiylar, hunarmandlar hamda uzoq va kam ta'minlangan hududlardagi tadbirkorlar uchun maxsus ijara stavkalari.",
    icon: "Star",
  },
];

/*
  The legacy markup reused ONE image for all three listing cards and hotlinked
  it to media.e-auksion.uz. `image` is intentionally omitted until real,
  self-hosted photography exists — the card falls back to a branded
  placeholder rather than showing the same building three times.
*/
export const featuredListings: Listing[] = [
  {
    id: "lot-24364329",
    title: "Noturar joy binosi, 1-qavat, alohida kirish",
    region: "toshkent-shahri",
    address: "Toshkent sh., Yakkasaroy tumani",
    type: "noturar",
    area: 126,
    pricePerYear: 86_400_000,
    // District centres, not surveyed plot coordinates — precise positions
    // should arrive with the listings API rather than be guessed here.
    lat: 41.2802,
    lng: 69.2418,
    lotNumber: "24364329",
    auctionUrl: "https://e-auksion.uz/lot-view?lot_id=24364329",
  },
  {
    id: "lot-24364512",
    title: "Ishlab chiqarish ombori, temir yoʻl tarmogʻiga yaqin",
    region: "samarqand",
    address: "Samarqand vil., Kattaqoʻrgʻon tumani",
    type: "ishlab-chiqarish",
    area: 480,
    pricePerYear: 124_000_000,
    lat: 39.8993,
    lng: 66.2536,
    lotNumber: "24364512",
  },
  {
    id: "lot-24364718",
    title: "Ma'muriy bino xonalari, ijtimoiy soha uchun",
    region: "fargona",
    address: "Farg'ona sh., markaziy hudud",
    type: "mamuriy",
    area: 92,
    pricePerYear: 51_700_000,
    lat: 40.3894,
    lng: 71.7869,
    lotNumber: "24364718",
  },
];

export const documents: DocItem[] = [
  {
    id: "vm-660",
    title: "VM qarori №660 «Davlat mulkini ijaraga berish tartibi toʻgʻrisida»",
    reference: "14.12.2023",
    url: "https://lex.uz/docs/-6693926",
    fileType: "pdf",
  },
  {
    id: "stavkalar-2026",
    title: "2026-yil uchun eng kam ijara stavkalari jadvali",
    reference: "12.01.2026",
    url: "https://davijara.uz/site/uz/eng-kam-stavkalar",
    fileType: "pdf",
  },
  {
    id: "namunaviy-shartnoma",
    title: "Ijara shartnomasining namunaviy shakli",
    reference: "26.02.2026",
    url: "https://static.e-auksion.uz/files/Ijara_shartnomasi_namuna.pdf",
    fileType: "docx",
  },
  {
    id: "auksion-yoriqnoma",
    title: "Onlayn-auksionda ishtirok etish yoʻriqnomasi",
    reference: "23.09.2026",
    url: "https://e-auksion.uz/info?page=bid-lot",
    fileType: "pdf",
  },
];
