import type { NewsItem } from "@/types/content";

/*
  Markaz yangiliklari — the press-centre store.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ NOTHING HERE MAY BE INVENTED.                                            │
  │                                                                          │
  │ This is a state body's announcement feed. A plausible-sounding headline  │
  │ on it reads to a citizen as something the Markaz has actually decided —  │
  │ a deadline they can rely on, a service they can go and use. That is the  │
  │ same reasoning that kept the legacy site's five-star "citizen            │
  │ testimonials" out of this codebase (see CLAUDE.md, "Deliberately not     │
  │ ported"), and it applies with more force here, because a news item does  │
  │ not look like marketing copy.                                            │
  │                                                                          │
  │ The four records below were carried over from the legacy homepage, where │
  │ they already shipped, so they are not new claims — but they are not      │
  │ sourced press releases either. THEY ARE PLACEHOLDERS AND THEY NEED TO BE │
  │ REPLACED with the Markaz's own announcements, verbatim, before this      │
  │ section can be called finished. None of them was given a `body`: the     │
  │ excerpt is all the text that exists, and writing three paragraphs        │
  │ underneath it would have been composing a government statement.          │
  └──────────────────────────────────────────────────────────────────────────┘

  ADDING A REAL ITEM — everything else follows from it:

      {
        slug: "url-da-koringan-nom",   // lowercase ASCII, no apostrophes
        title: "Sarlavha",             // as published
        excerpt: "Bir-ikki gapli qisqacha mazmun.",
        publishedAt: "2026-08-26",     // ISO; SORT ORDER comes from this
        category: "xizmatlar",         // NewsCategory slug
        body: [
          "Birinchi xatboshi.",
          "Ikkinchi xatboshi.",
        ],
      }

  The list page, its category chips and their counts, the pager, the article
  page, `generateStaticParams` and the sitemap all derive from this array —
  none of them carries a hand-typed number or a hand-listed slug.

  `slug` IS A PERMANENT URL. Once an item is published, editing its slug
  breaks every link anyone has shared. Correct the title, leave the slug.
*/
export const news: NewsItem[] = [
  {
    slug: "qr-kod-orqali-tolov",
    title:
      "Ijara shartnomalari boʻyicha toʻlovlar endi QR-kod orqali qabul qilinadi",
    excerpt:
      "Shaxsiy kabinetdagi onlayn toʻlov imkoniyatlariga QR-kod orqali toʻlash qoʻshildi.",
    publishedAt: "2025-07-02",
    category: "xizmatlar",
  },
  {
    slug: "ijtimoiy-soha-imtiyoz-uzaytirildi",
    title: "Ijtimoiy soha obyektlari uchun imtiyozli ijara muddati uzaytirildi",
    excerpt:
      "Maktabgacha va maktab yoshidagi bolalar muassasalari uchun imtiyoz 10 yilgacha berildi.",
    publishedAt: "2025-06-24",
    category: "imtiyozlar",
  },
  {
    slug: "sayyor-qabul-kunlari",
    title: "Hududlarda sayyor qabul kunlari eʼlon qilindi",
    excerpt:
      "Markaz mutaxassislari tadbirkorlarning savollariga bevosita joylarda javob beradi.",
    publishedAt: "2025-06-15",
    category: "tadbirlar",
  },
  {
    slug: "mobil-versiya",
    title: "Portalning yangi mobil versiyasi ishga tushirildi",
    excerpt:
      "Endi auksion jarayonlarida smartfon orqali ham xuddi shunday oson ishtirok etish mumkin.",
    publishedAt: "2025-06-06",
    category: "portal",
  },
];
