import type { Block } from "@/types/blocks";
import type { NewsCategory, NewsItem } from "@/types/content";

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
  │ So every record below states something that is true and checkable:       │
  │                                                                          │
  │   * the two figure items were read off the live register on 26.08.2026 — │
  │     the largest open lot (number, region, area, start price, auction     │
  │     date) and this year's leased count. The lot number makes the first   │
  │     verifiable on e-auksion.uz; the second is the same figure            │
  │     /sotilgan-obyektlar prints;                                          │
  │   * the two portal items describe THIS SITE, which the reader can        │
  │     confirm by using the pages they name.                                │
  │                                                                          │
  │ WHAT IS STILL PROVISIONAL: the publication DATES. The portal features    │
  │ did land (git says 21.07.2026 for both), and the figures are today's,    │
  │ but when the Markaz chose to ANNOUNCE any of this is the Markaz's to     │
  │ say. Replace the dates — and ideally the wording — with the operator's   │
  │ own before this section is called finished.                              │
  └──────────────────────────────────────────────────────────────────────────┘

  ADDING A REAL ITEM — everything else follows from it:

      {
        slug: "url-da-koringan-nom",   // lowercase ASCII, no apostrophes
        title: "Sarlavha",             // as published
        excerpt: "Bir-ikki gapli qisqacha mazmun.",
        publishedAt: "2026-08-26",     // ISO; SORT ORDER comes from this
        category: "obyektlar",         // NewsCategory slug
        body: [
          "Birinchi xatboshi.",
          "Ikkinchi xatboshi.",
        ],
      }

  The list page, the lead card, the pager, the article page, its sidebar,
  `generateStaticParams` and the sitemap all derive from this array — none of
  them carries a hand-typed number or a hand-listed slug.

  `slug` IS A PERMANENT URL. Once an item is published, editing its slug
  breaks every link anyone has shared. Correct the title, leave the slug.
*/
export const news: NewsItem[] = [
  {
    /*
      Lot 25168853, read off the register on 26.08.2026: the largest open lot
      in the country by area. Every figure in the text is upstream's own, and
      the lot number lets a reader check all of them against e-auksion.uz.
    */
    slug: "namangan-36600-kv-m-obyekt",
    title:
      "Namangan viloyatida 36 600 m² maydonli obyekt ijaraga taklif etildi",
    excerpt:
      "Uychi tumanidagi boʻsh turgan obyekt boʻyicha savdo 3-sentabr kuni oʻtkaziladi. Boshlangʻich narx — 60 655 276,80 soʻm.",
    publishedAt: "2026-08-26",
    category: "obyektlar",
    body: [
      "Namangan viloyati Uychi tumanida joylashgan 36 600 kvadrat metrlik obyekt ochiq elektron auksion orqali ijaraga beriladi. Lot raqami — 25168853.",
      "Savdo 2026-yil 3-sentabr kuni soat 10:00 da e-auksion.uz platformasida oʻtkaziladi. Arizalar savdo boshlanishidan bir soat oldin qabul qilinishi toʻxtatiladi.",
      "Bugungi kunda portalda mamlakat boʻylab 1 559 ta boʻsh davlat obyekti ijaraga taklif etilmoqda.",
    ],
  },
  {
    slug: "portal-sinov-rejimida",
    title:
      "Davijara.uz portalining yangi versiyasi sinov rejimida ishga tushirildi",
    excerpt:
      "Boʻsh obyektlar katalogi, xarita va ijaraga berilgan obyektlar boʻlimi yangilandi.",
    publishedAt: "2026-07-21",
    category: "portal",
    body: [
      "Portalning yangi versiyasi sinov rejimida foydalanuvchilarga ochildi. Boʻsh turgan davlat obyektlarini hudud, tuman, maydon, narx va savdo kuni boʻyicha izlash mumkin.",
      "Obyektlarni roʻyxat koʻrinishida ham, xaritada ham koʻrish mumkin. Har bir lot e-auksion.uz dagi oʻz sahifasiga bogʻlangan.",
      "Sayt sinov rejimida ishlamoqda — kamchiliklar boʻyicha murojaatlarni Aloqa boʻlimi orqali yuborish mumkin.",
    ],
  },
  {
    /*
      3 072 is this year's count of lots with a `sold_price`, read off the
      register on 26.08.2026 — the same figure /sotilgan-obyektlar prints, so
      a reader can check the headline against the list it summarises.

      NOT "yakunlangan savdolar". A concluded auction and a concluded LEASE
      are different numbers: e-auksion's finished list counts every round,
      including the ones that found no tenant and were relisted under a new
      lot number. This counts contracts.
    */
    slug: "joriy-yilda-ijaraga-berilgan-obyektlar",
    title: "Joriy yilda savdolarda 3 072 ta davlat obyekti ijaraga berildi",
    excerpt:
      "Natijalar hudud va tuman boʻyicha portalning «Ijaraga berilgan obyektlar» boʻlimida eʼlon qilinadi.",
    publishedAt: "2026-08-20",
    category: "obyektlar",
    body: [
      "2026-yil boshidan buyon ochiq elektron auksionlarda 3 072 ta boʻsh davlat obyekti ijaraga berildi.",
      "Har bir obyekt boʻyicha boshlangʻich narx, savdo natijasidagi narx, maydon va joylashuv koʻrsatilgan. Maʼlumotlar savdo yakunlangach yangilanadi.",
      "Natijalarni hudud va tuman boʻyicha saralash mumkin.",
    ],
  },
  {
    slug: "ijara-imtiyozlari-bolimi",
    title: "Ijara imtiyozlari boʻlimi: 24 ta imtiyoz bir joyda",
    excerpt:
      "Ijtimoiy soha, taʼlim, IT va hunarmandchilik boʻyicha imtiyozlar huquqiy asoslari bilan birga keltirilgan.",
    publishedAt: "2026-07-21",
    category: "imtiyozlar",
    body: [
      "Boʻlimda davlat mulkini ijaraga olishda beriladigan 24 ta imtiyoz jamlangan. Har bir imtiyoz uchun kimga tegishli ekani, qancha muddatga berilishi va qaysi hujjat asosida qoʻllanishi koʻrsatilgan.",
      "Imtiyozlarni yoʻnalish boʻyicha saralash mumkin: ijtimoiy himoya, taʼlim muassasalari, IT va innovatsiya, sport va hunarmandchilik.",
    ],
  },
];

/*
  ┌──────────────────────────────────────────────────────────────────────────┐
  │ VM 563 — added by migration 19, not by the array above.                  │
  │                                                                          │
  │ SOURCE: "Документ Microsoft Word 563.docx", supplied by the operator     │
  │ 26.10.2026 for Markaz yangiliklari, with its infographic. The document  │
  │ is in Uzbek CYRILLIC; this site publishes Latin Uzbek, so the text was   │
  │ converted letter by letter by the 1995 alphabet's rules (е→ye at a word  │
  │ start or after a vowel/ъ, ц→s/ts, ъ before е dropped: объект→obyekt,     │
  │ ў/ғ→oʻ/gʻ) — a change of SCRIPT, not of a single word.                   │
  │                                                                          │
  │ The INFOGRAPHIC was Cyrillic and 3:2 too, and the operator asked for it  │
  │ in Latin at this site's 16:9 (26.10.2026). It was rebuilt at 1600×900:  │
  │ the photo column is the supplied photo with the decree prop's three     │
  │ Cyrillic lines repainted in Latin ("№ 563" and the emblem untouched);   │
  │ the panel is set in the site's own Inter/Roboto with lucide icons, and  │
  │ its text is the same transliteration as below, bold where the supplied  │
  │ infographic was bold.                                                   │
  │                                                                          │
  │ The four changes are an ORDERED list because the operator's own         │
  │ infographic numbers them 1-4; the document sets them as plain           │
  │ paragraphs. The intro is the excerpt, which the article page prints as  │
  │ its lead. Category "obyektlar" is this file's choice — the five slugs   │
  │ have no "legislation" topic — and an editor can change it in the panel. │
  └──────────────────────────────────────────────────────────────────────────┘
*/
export const newsSeedV19: {
  slug: string;
  title: string;
  excerpt: string;
  publishedAt: string;
  category: NewsCategory;
  image: string;
  blocks: Block[];
} = {
  slug: "vm-563-ijara-tartibiga-ozgartirishlar",
  title:
    "Davlat mulkini ijaraga berish tartibiga kiritilgan oʻzgartirish va qoʻshimchalar",
  excerpt:
    "Vazirlar Mahkamasining 2023 yil 14 dekabrdagi 660-son qarori bilan tasdiqlangan davlat mulkini ijaraga berish toʻgʻrisidagi Nizomga Vazirlar Mahkamasining 2026 yil 13 oktyabrdagi 563-son qarori 1-ilovasining 38-bandi bilan quyidagi oʻzgartirish va qoʻshimchalar kiritildi:",
  publishedAt: "2026-10-26",
  category: "obyektlar",
  image: "/yangiliklar/vm-563-ijara-tartibi.jpg",
  blocks: [
    {
      type: "list",
      ordered: true,
      items: [
        "Ijara shartnomasi shartlarini, shu jumladan ijara toʻlovlarini ketma-ket uch va undan ortiq marta bajarmagan ijarachilar bir yil muddatga davlat mulkini ijaraga berish boʻyicha auksion savdolarida ishtirok etishdan chetlatiladi.",
        "Chetlatilgan ijarachilar reyestri «online-ijara.uz» axborot tizimida yuritiladi va «E-auksion» elektron savdo platformasiga integratsiya qilinadi.",
        "Ijarachi reyestrga kiritilgan sanadan boshlab 12 oy oʻtgach, reyestrdan avtomatik ravishda chiqariladi.",
        "Yuqori texnologiyali mahsulotlar yaratuvchi tadbirkorlik subyektlariga maydoni 10 ming kvadrat metrgacha boʻlgan davlat mulki obyektlarini 5 yil muddatga toʻgʻridan-toʻgʻri bepul foydalanishga berish, shartnoma shartlari bajarilgan taqdirda esa baholangan qiymatda toʻgʻridan-toʻgʻri sotish imkoniyati belgilandi.",
      ],
    },
  ],
};
