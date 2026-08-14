import type {
  DocItem,
  Listing,
  NewsItem,
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

export const heroStats: Stat[] = [
  {
    value: "1 390+",
    label: "Ijaraga taklif etilayotgan obyektlar",
    icon: "Building2",
  },
  {
    value: "28 075",
    label: "Amalga oshirilgan ijara shartnomalari",
    icon: "FileText",
  },
  {
    value: "145,9",
    label: "Ijaraga olingan umumiy maydon (mln m²)",
    icon: "LandPlot",
  },
];

export const impactStats: Stat[] = [
  { value: "469,9 mlrd", label: "so'm — 2026 yilgi ijara to'lovlari" },
  { value: "98%", label: "Elektron shaklda tuzilgan shartnomalar" },
  { value: "3 kun", label: "Obyektni savdoga chiqarish o'rtacha muddati" },
  { value: "24/7", label: "Portal orqali xizmatlardan foydalanish" },
];

export const steps: Step[] = [
  {
    number: "01",
    title: "Obyektni tanlang",
    description:
      "Portalda hudud, tur va maydon bo'yicha mo'ljallangan obyektni toping.",
    icon: "MapPin",
  },
  {
    number: "02",
    title: "Auksionda qatnashing",
    description: "«E-auksion» savdo platformasida onlayn ishtirok eting.",
    icon: "Gavel",
  },
  {
    number: "03",
    title: "Shartnoma tuzing",
    description:
      "G'olib deb topilgach, shartnoma elektron raqamli imzo bilan imzolanadi.",
    icon: "FileText",
  },
  {
    number: "04",
    title: "To'lovni amalga oshiring",
    description:
      "Ijara to'lovlarini shaxsiy kabinet orqali onlayn kuzatib to'lang.",
    icon: "CircleCheck",
  },
];

export const services: Service[] = [
  {
    slug: "kalkulyator",
    title: "Ijara kalkulatori",
    description:
      "Obyekt maydoni va joylashuviga ko'ra taxminiy ijara to'lovini hisoblang.",
    icon: "Calculator",
    href: "/xizmatlar/kalkulyator",
  },
  {
    slug: "stavkalar",
    title: "Eng kam stavkalar",
    description:
      "Hudud bo'yicha 1 m² uchun belgilangan eng kam ijara narxlarini ko'ring.",
    icon: "TrendingDown",
    href: "/xizmatlar/stavkalar",
  },
  {
    slug: "ariza",
    title: "Ariza yuborish",
    description:
      "Obyektni ijaraga chiqarish bo'yicha taklifni onlayn tartibda yuboring.",
    icon: "Send",
    href: "/xizmatlar/ariza",
  },
  {
    slug: "shartnoma",
    title: "Shartnoma holati",
    description:
      "Ijara shartnomangiz va to'lovlar holatini raqam bo'yicha kuzating.",
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
      "Ayollar, yoshlar va nogironligi bo'lgan shaxslar ishtirokidagi tadbirkorlik subyektlari uchun ijara to'lovidan 50–100% gacha chegirma.",
    icon: "Heart",
  },
  {
    category: "talim" as const,
    title: "Ta'lim va tarbiya muassasalari",
    description:
      "Xususiy o'quv markazlari, kasb-hunar kolleji binolari va bolalar bog'chalari uchun bepul yoki yengillashtirilgan ijara sharoiti.",
    icon: "GraduationCap",
  },
  {
    category: "it" as const,
    title: "IT va innovatsion loyihalar",
    description:
      "IT-park hamda raqamli texnologiyalar sohasidagi korxonalar uchun bo'sh davlat obyektlaridan bepul foydalanish huquqi.",
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
    title: "Ishlab chiqarish ombori, temir yo'l tarmog'iga yaqin",
    region: "samarqand",
    address: "Samarqand vil., Kattaqo'rg'on tumani",
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

export const news: NewsItem[] = [
  {
    slug: "qr-kod-orqali-tolov",
    title:
      "Ijara shartnomalari bo'yicha to'lovlar endi QR-kod orqali qabul qilinadi",
    excerpt:
      "Shaxsiy kabinetdagi onlayn to'lov imkoniyatlariga QR-kod orqali to'lash qo'shildi.",
    publishedAt: "2025-07-02",
    category: "Xizmatlar",
  },
  {
    slug: "ijtimoiy-soha-imtiyoz-uzaytirildi",
    title: "Ijtimoiy soha obyektlari uchun imtiyozli ijara muddati uzaytirildi",
    excerpt:
      "Maktabgacha va maktab yoshidagi bolalar muassasalari uchun imtiyoz 10 yilgacha berildi.",
    publishedAt: "2025-06-24",
    category: "Imtiyozlar",
  },
  {
    slug: "sayyor-qabul-kunlari",
    title: "Hududlarda sayyor qabul kunlari e'lon qilindi",
    excerpt:
      "Markaz mutaxassislari tadbirkorlarning savollariga bevosita joylarda javob beradi.",
    publishedAt: "2025-06-15",
    category: "Tadbirlar",
  },
  {
    slug: "mobil-versiya",
    title: "Portalning yangi mobil versiyasi ishga tushirildi",
    excerpt:
      "Endi auksion jarayonlarida smartfon orqali ham xuddi shunday oson ishtirok etish mumkin.",
    publishedAt: "2025-06-06",
    category: "Portal",
  },
];

export const documents: DocItem[] = [
  {
    id: "vm-660",
    title: "VM qarori №660 «Davlat mulkini ijaraga berish tartibi to'g'risida»",
    reference: "14.12.2023 · 1,9 MB",
    url: "https://lex.uz",
    fileType: "pdf",
  },
  {
    id: "stavkalar-2026",
    title: "2026-yil uchun eng kam ijara stavkalari jadvali",
    reference: "12.01.2026 · 0,8 MB",
    url: "https://lex.uz",
    fileType: "pdf",
  },
  {
    id: "namunaviy-shartnoma",
    title: "Ijara shartnomasining namunaviy shakli",
    reference: "26.02.2026 · 0,4 MB",
    url: "https://lex.uz",
    fileType: "docx",
  },
  {
    id: "auksion-yoriqnoma",
    title: "Onlayn-auksionda ishtirok etish yo'riqnomasi",
    reference: "23.09.2026 · 2,1 MB",
    url: "https://e-auksion.uz",
    fileType: "pdf",
  },
];
