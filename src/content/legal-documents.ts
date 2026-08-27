/*
  Sohaga doir normativ-huquqiy hujjatlar roʻyxati — supplied whole by the
  operator (2026-08-28): document titles and their lex.uz citation links.
  Titles are verbatim (apostrophes normalised to the site's own oʻ/gʻ
  convention only); every link points at lex.uz, the state legal-database.

  The Fuqarolik kodeksi carries TWO links in the source with no label
  distinguishing them — labelled here as "1-qism" / "2-qism" because the
  Civil Code is officially published in two parts, a fact about the code
  itself rather than something read into the source.
*/

export type LegalDocumentLink = {
  label: string | null;
  href: string;
};

export type LegalDocument = {
  title: string;
  links: LegalDocumentLink[];
};

export const legalDocuments: LegalDocument[] = [
  {
    title: "Oʻzbekiston Respublikasining Fuqarolik kodeksi",
    links: [
      { label: "1-qism", href: "https://lex.uz/uz/docs/-111189" },
      { label: "2-qism", href: "https://lex.uz/uz/docs/-180552" },
    ],
  },
  {
    title: "Oʻzbekiston Respublikasining “Ijara toʻgʻrisida”gi Qonuni",
    links: [{ label: null, href: "https://lex.uz/uz/docs/-112328" }],
  },
  {
    title:
      "Oʻzbekiston Respublikasining “Davlat mulkini boshqarish toʻgʻrisida”gi Qonuni",
    links: [{ label: null, href: "https://lex.uz/uz/docs/-6401697" }],
  },
  {
    title:
      "Oʻzbekiston Respublikasi Prezidentining 2020-yil 1-iyuldagi “Boʻsh turgan obyektlardan samarali foydalanishni tashkil etish va axborot-kommunikatsiya texnologiyalarini keng joriy etish chora-tadbirlari toʻgʻrisida”gi PQ–4771-son qarori",
    links: [{ label: null, href: "https://lex.uz/uz/docs/-4879040" }],
  },
  {
    title:
      "Oʻzbekiston Respublikasi Vazirlar Mahkamasining 2023-yil 14-dekabrdagi “Davlat mulkini ijaraga berish tartibini yanada takomillashtirish toʻgʻrisida”gi 660-son qarori",
    links: [{ label: null, href: "https://lex.uz/uz/docs/-6693926" }],
  },
  {
    title:
      "Oʻzbekiston Respublikasi Vazirlar Mahkamasining 2024-yil 11-yanvardagi “Oʻzbekiston Respublikasi Davlat aktivlarini boshqarish agentligi faoliyatini tashkil etish chora-tadbirlari toʻgʻrisida”gi 23-son qarori",
    links: [{ label: null, href: "https://lex.uz/uz/docs/-6750454#-6753949" }],
  },
  {
    title:
      "Oʻzbekiston Respublikasi Vazirlar Mahkamasining 2025-yil 21-apreldagi “Boʻsh turgan davlat koʻchmas mulk obyektlarini xatlovdan oʻtkazish va ulardan samarali foydalanishni tashkil etish chora-tadbirlari toʻgʻrisida”gi 247-son qarori",
    links: [{ label: null, href: "https://lex.uz/uz/docs/-7498085" }],
  },
  {
    title:
      "Oʻzbekiston Respublikasi Davlat aktivlarini boshqarish agentligi direktorining 2022-yil 6-iyundagi “Maydoni 2000 kvadrat metrgacha boʻlgan boʻsh turgan davlat koʻchmas mulk obyektlarini hokim yordamchilarining onlayn-buyurtmanomasiga asosan toʻgʻridan-toʻgʻri elektron onlayn-auksion savdolariga chiqarish tartibi toʻgʻrisidagi nizomni tasdiqlash haqida”gi 170-son buyrugʻi (roʻyxat raqami 3372, 2022-yil 28-iyun)",
    links: [{ label: null, href: "https://lex.uz/uz/docs/-6086503" }],
  },
  {
    title:
      "Oʻzbekiston Respublikasi Davlat aktivlarini boshqarish agentligi direktorining 2022-yil 29-noyabrdagi “Vazirliklar, idoralar va mahalliy davlat hokimiyati organlariga tegishli boʻsh turgan davlat koʻchmas mulk obyektlarini ularning roziligisiz ijaraga berish yoki sotish uchun savdoga chiqarish tartibi toʻgʻrisidagi nizomni tasdiqlash haqida”gi 326-son buyrugʻi (roʻyxat raqami 3403, 2022-yil 19-dekabr)",
    links: [{ label: null, href: "https://lex.uz/uz/docs/-6316578" }],
  },
  {
    title:
      "Oʻzbekiston Respublikasi Davlat aktivlarini boshqarish agentligi direktorining 2024-yil 13-fevraldagi “Maydoni 2 000 metr kvadratgacha boʻlgan boʻsh turgan davlat koʻchmas mulk obyektlarini jismoniy shaxslarning onlayn-buyurtmanomasiga asosan xususiylashtirish yoki ijaraga berish uchun toʻgʻridan-toʻgʻri elektron onlayn-auksion savdolariga chiqarish tartibi toʻgʻrisidagi nizomni tasdiqlash haqida”gi 56-son buyrugʻi (roʻyxat raqami 3503, 2024-yil 18-mart)",
    links: [{ label: null, href: "https://lex.uz/uz/docs/-6847026" }],
  },
];
