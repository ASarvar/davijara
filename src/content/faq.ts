import type { FaqItem } from "@/types/content";

/*
  Ported verbatim from davijara-v2.html, with one typo corrected
  ("subijaragа" contained a Cyrillic а).

  These answers describe legal procedure — deposit percentages, contract terms,
  the sub-letting prohibition. Treat them like the privilege records: they are
  statements about the law, so corrections come from the legislation, not from
  editing the prose. Where an answer cites a range (10-30% deposit, 1-5 year
  term), verify against the current decree before publishing.
*/

export const faq: FaqItem[] = [
  {
    question: "Davlat mulkini ijaraga olish uchun kimlar ariza bera oladi?",
    answer:
      "Jismoniy shaxslar, yuridik shaxslar va yakka tartibdagi tadbirkorlar ariza bera oladi. Buning uchun shaxsiy kabinet orqali ro'yxatdan o'tish va kerakli hujjatlarni yuklash kifoya.",
  },
  {
    question: "Auksionlarda qatnashish uchun garov to'lovi kerakmi?",
    answer:
      "Ha, auksion boshlanishidan oldin boshlang'ich garov to'lovi (lotning 10-30%) to'lanishi kerak. G'olib bo'lmasangiz, garov to'lov qaytariladi.",
  },
  {
    question: "Shartnoma qancha muddatga tuziladi?",
    answer:
      "Ijara shartnomasi odatda 1 yildan 5 yilgacha bo'lgan muddatga tuziladi. Ijtimoiy soha uchun 10 yilgacha uzaytirilishi mumkin. Muddatni auktsion shartlari belgilaydi.",
  },
  {
    question: "E-auksionlarda qatnashish uchun elektron imzo kerakmi?",
    answer:
      "Ha, elektron raqamli imzo (ERI) talab etiladi. Uni «My.gov.uz» portali yoki vakolatli markazlar orqali bepul olish mumkin. Jarayon taxminan 30 daqiqa davom etadi.",
  },
  {
    question: "Ijaraga olgan obyektni subijaraga bersak bo'ladimi?",
    answer:
      "Subijaraga berish qonun bo'yicha man etilgan. Faqatgina mulkdorning yozma roziligidan keyin ba'zi hollarda mumkin. Shartnomani diqqat bilan o'qib chiqing.",
  },
  {
    question: "To'lovni qanday usullarda amalga oshirish mumkin?",
    answer:
      "To'lovni bank o'tkazmasi, QR-kod skanerlash, Uzum, Click, Payme va boshqa elektron to'lov tizimlari orqali amalga oshirishingiz mumkin. Barcha to'lovlar shaxsiy kabinetda ko'rinadi.",
  },
];

/*
  Partner organisations, from the legacy partners strip.
  "E-auktsion.uz" normalised to "e-auksion.uz" for consistency with the rest of
  the site; "Davlat.uz" kept as listed.
*/
export const partners = [
  { label: "Davlat.uz", href: "https://davlat.uz", icon: "Landmark" },
  { label: "Lex.uz", href: "https://lex.uz", icon: "Scale" },
  { label: "My.gov.uz", href: "https://my.gov.uz", icon: "IdCard" },
  { label: "e-auksion.uz", href: "https://e-auksion.uz", icon: "Gavel" },
  { label: "Markaziy bank", href: "https://cbu.uz", icon: "Building2" },
  { label: "Opendata.gov.uz", href: "https://opendata.uz", icon: "PieChart" },
];
