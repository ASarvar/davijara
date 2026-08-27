/*
  Korrupsiyaga qarshi kurashish — the Centre's anti-corruption disclosure.

  ┌──────────────────────────────────────────────────────────────────────────┐
  │ SOURCE: "Korrupsiyaga qarshi kurashish.docx", supplied by the operator    │
  │ 2026-08-27. Transcribed verbatim — every word, number, legal citation and │
  │ statistic below is exactly what the source document says. Nothing here   │
  │ was reworded, summarised or translated.                                  │
  │                                                                          │
  │ THE ONLY EDITS ARE TYPOGRAPHIC, not textual. The source .docx used MS    │
  │ Word's smart-quote autocorrect, which produced the generic curly         │
  │ apostrophe U+2018/U+2019 (' / ') everywhere this site's own Latin Uzbek  │
  │ spelling uses two DIFFERENT letters — see src/content/about.ts and       │
  │ src/content/duties.ts, already on disk, for the established convention: │
  │   - ʻ  (U+02BB, turned comma) for the oʻ / gʻ digraphs — boʻyicha,       │
  │     toʻgʻrisida, yoʻl, targʻibot, …                                      │
  │   - ʼ  (U+02BC, modifier apostrophe) for the Arabic-origin hamza in      │
  │     maʼlumot, taʼminlash, eʼtibor, masʼuliyat, maʼmuriy, maʼruza,        │
  │     suiisteʼmol.                                                        │
  │ Each occurrence below was reclassified by the word it appears in, not    │
  │ mechanically swapped — Word's autocorrect used BOTH curly marks          │
  │ inconsistently for the same sound (compare "qoʻzgʻatildi" in the source, │
  │ which mixed ‘ and ’ for what is the same oʻ/gʻ digraph twice in one      │
  │ word). The source's own " – " (en dash) was normalised to " — " (em      │
  │ dash) for the same reason about.ts already uses an em dash in            │
  │ "(avvalgi nomi — Boʻsh turgan …)" — that is this site's house style for  │
  │ this construction, and the docx's dash reads as the same autocorrect     │
  │ artifact (a typed " - " Word turned into an en dash), not a deliberate   │
  │ choice by the author. The curly double quotes “ ” around law and decree  │
  │ titles were already exactly what about.ts uses for the same purpose and  │
  │ needed no change at all.                                                 │
  └──────────────────────────────────────────────────────────────────────────┘

  NOT YET DATABASE-BACKED. Unlike about.ts and duties.ts (moved to the panel
  by migrations 5/6), this content is code-only for now — nothing in this
  session's request asked for it to be panel-editable. If the operator wants
  it editable later, the migration this needs is the same shape those two
  already went through: a table row, a zod schema in types/documents.ts, and
  a fallback read exactly like getAbout()/getDuties() so a bad restore still
  shows this text rather than an empty page.
*/

export type AnticorruptionSection = {
  heading: string;
  /** Paragraphs before the list — or the section's entire content, if it has no list. */
  paragraphs: string[];
  /** A short line introducing the list, e.g. "Ekspertiza jarayonida:". */
  listIntro?: string;
  items?: string[];
  /** Paragraphs after the list. */
  closingParagraphs?: string[];
};

export const sections: AnticorruptionSection[] = [
  {
    heading: "Korrupsiyaga qarshi kurashish siyosati va normativ-huquqiy baza",
    paragraphs: [
      "Davlat mulki obyektlaridan samarali foydalanish markazida (keyingi oʻrinlarda — Markaz) korrupsiyaning oldini olish, korrupsiyaviy xavf-xatarlarni aniqlash va bartaraf etish, manfaatlar toʻqnashuvining oldini olish, xodimlarning halolligi va masʼuliyatini oshirish hamda korrupsiyaga nisbatan murosasiz munosabatni shakllantirishga qaratilgan tizimli ishlar amalga oshirilmoqda.",
      "Markaz faoliyatida korrupsiyaga qarshi kurashish quyidagi asosiy normativ-huquqiy hujjatlar asosida amalga oshiriladi:",
    ],
    items: [
      "Oʻzbekiston Respublikasining 2017-yil 3-yanvardagi OʻRQ-419-son “Korrupsiyaga qarshi kurashish toʻgʻrisida”gi Qonuni;",
      "Oʻzbekiston Respublikasining 2024-yil 5-iyundagi OʻRQ-931-son “Manfaatlar toʻqnashuvi toʻgʻrisida”gi Qonuni;",
      "Oʻzbekiston Respublikasining 2022-yil 8-avgustdagi OʻRQ-788-son “Davlat fuqarolik xizmati toʻgʻrisida”gi Qonuni;",
      "Oʻzbekiston Respublikasining 2023-yil 8-avgustdagi OʻRQ-860-son “Normativ-huquqiy hujjatlarning va ular loyihalarining korrupsiyaga qarshi ekspertizasi toʻgʻrisida”gi Qonuni;",
      "Oʻzbekiston Respublikasining “Davlat xaridlari toʻgʻrisida”gi Qonuni;",
      "Oʻzbekiston Respublikasi Prezidentining 2019-yil 27-maydagi PF-5729-son “Oʻzbekiston Respublikasida korrupsiyaga qarshi kurashish tizimini yanada takomillashtirish chora-tadbirlari toʻgʻrisida”gi Farmoni;",
      "Oʻzbekiston Respublikasi Prezidentining 2020-yil 29-iyundagi PF-6013-son “Oʻzbekiston Respublikasida korrupsiyaga qarshi kurashish tizimini takomillashtirish boʻyicha qoʻshimcha chora-tadbirlar toʻgʻrisida”gi Farmoni;",
      "Oʻzbekiston Respublikasi Prezidentining 2021-yil 6-iyuldagi PF-6257-son “Korrupsiyaga qarshi murosasiz munosabatda boʻlish muhitini yaratish, davlat va jamiyat boshqaruvida korrupsiyaviy omillarni keskin kamaytirish va bunda jamoatchilik ishtirokini kengaytirish chora-tadbirlari toʻgʻrisida”gi Farmoni;",
      "Oʻzbekiston Respublikasi Prezidentining 2022-yil 11-maydagi PQ-240-son “Davlat boshqaruvi sohasida korrupsiyaviy xavf-xatarlarni bartaraf etish mexanizmlarini takomillashtirish va ushbu sohada jamoatchilik ishtirokini kengaytirish chora-tadbirlari toʻgʻrisida”gi qarori;",
      "Oʻzbekiston Respublikasi Prezidentining 2023-yil 27-noyabrdagi PF-200-son “Korrupsiyaga qarshi kurashish tizimini yanada takomillashtirish hamda davlat organlari va tashkilotlari faoliyati ustidan jamoatchilik nazorati tizimi samaradorligini oshirish chora-tadbirlari toʻgʻrisida”gi Farmoni;",
      "Oʻzbekiston Respublikasi Prezidentining 2024-yil 5-iyundagi PQ-210-son “Oʻzbekiston Respublikasining “Manfaatlar toʻqnashuvi toʻgʻrisida”gi Qonuni ijrosini samarali tashkil etish chora-tadbirlari toʻgʻrisida”gi qarori;",
      "Oʻzbekiston Respublikasi Prezidentining 2025-yil 21-apreldagi PF-71-son Farmoni;",
      "Oʻzbekiston Respublikasi Korrupsiyaga qarshi kurashish agentligi direktorining 2021-yil 8-sentabrdagi, Adliya vazirligida 3319-son bilan roʻyxatdan oʻtkazilgan “Korrupsiyaga qarshi ichki nazorat tuzilmalari faoliyati toʻgʻrisidagi namunaviy nizomni tasdiqlash toʻgʻrisida”gi buyrugʻi;",
      "Korrupsiyaga qarshi kurashish sohasidagi boshqa normativ-huquqiy hujjatlar.",
    ],
    closingParagraphs: [
      "Mazkur normativ-huquqiy hujjatlar talablari Markaz faoliyatida korrupsiyaviy xavf-xatarlarni kamaytirish, manfaatlar toʻqnashuvini tartibga solish, davlat xaridlarining shaffofligini taʼminlash, xodimlarning odob-axloq qoidalariga rioya etishini nazorat qilish hamda jamoatchilik nazoratini kuchaytirishda asos boʻlib xizmat qiladi.",
    ],
  },
  {
    heading: "Odob-axloq qoidalari",
    paragraphs: [
      "Markaz xodimlari oʻz xizmat faoliyatida qonuniylik, halollik, xolislik, adolatlilik, fuqarolar va tadbirkorlik subyektlarining huquq va qonuniy manfaatlariga hurmat bilan munosabatda boʻlish, xizmat mavqeidan shaxsiy manfaatlar yoʻlida foydalanmaslik tamoyillariga rioya qiladi.",
      "Xodimlarga xizmat vazifalarini bajarish jarayonida noqonuniy manfaat, sovgʻa yoki boshqa moddiy va nomoddiy manfaatlarni qabul qilish, manfaatlar toʻqnashuviga olib keladigan vaziyatlarga yoʻl qoʻyish hamda xizmat mavqeidan shaxsiy yoki uchinchi shaxslar manfaatida foydalanish taqiqlanadi.",
      "Markaz xodimlari uchun odob-axloq qoidalari Markazning ichki hujjatlari asosida tartibga solinadi.",
    ],
  },
  {
    heading: "Korrupsiyaga qarshi chora-tadbirlar dasturi va rejalari",
    paragraphs: [
      "Markazda korrupsiyaga qarshi kurashish boʻyicha tasdiqlangan dastur va chora-tadbirlar rejasiga muvofiq quyidagi yoʻnalishlarda ishlar amalga oshiriladi:",
    ],
    items: [
      "korrupsiyaviy xavf-xatarlarni aniqlash va baholash;",
      "korrupsiyaviy xavf-xatarlarni kamaytirish va bartaraf etish;",
      "manfaatlar toʻqnashuvini aniqlash va tartibga solish;",
      "davlat xaridlarida shaffoflik va qonuniylikni taʼminlash;",
      "xodimlarning korrupsiyaga qarshi kurashish boʻyicha bilimlarini oshirish;",
      "korrupsiyaga qarshi ichki hujjatlarni takomillashtirish;",
      "ichki nazorat tadbirlarini kuchaytirish;",
      "korrupsiyaga oid murojaatlarni oʻrganish;",
      "aniqlangan kamchiliklar boʻyicha tegishli choralar koʻrish;",
      "jamoatchilik va ommaviy axborot vositalari bilan hamkorlikni rivojlantirish.",
    ],
    closingParagraphs: [
      "Markazning korrupsiyaga qarshi chora-tadbirlar dasturi va uning ijrosi toʻgʻrisidagi maʼlumotlar muntazam ravishda tahlil qilinadi.",
    ],
  },
  {
    heading: "Ichki idoraviy hujjatlarning korrupsiyaga qarshi ekspertizasi",
    paragraphs: [
      "Markazda ishlab chiqiladigan ichki idoraviy hujjatlar va ularning loyihalari korrupsiyaga sabab boʻlishi mumkin boʻlgan omillarni aniqlash va bartaraf etish maqsadida belgilangan tartibda huquqiy hamda korrupsiyaga qarshi ekspertizadan oʻtkaziladi.",
    ],
    listIntro: "Ekspertiza jarayonida:",
    items: [
      "manfaatlar toʻqnashuviga sabab boʻlishi mumkin boʻlgan normalar;",
      "mansabdor shaxslarga asossiz yoki haddan tashqari keng vakolat beruvchi qoidalar;",
      "qaror qabul qilishning noaniq yoki shaffof boʻlmagan tartiblari;",
      "ortiqcha maʼmuriy toʻsiqlar;",
      "korrupsiyaviy xavf-xatarlarni yuzaga keltiruvchi boshqa omillar aniqlanadi va ularni bartaraf etish boʻyicha takliflar ishlab chiqiladi.",
    ],
  },
  {
    heading:
      "Korrupsiyaviy huquqbuzarliklar va jinoyatlar toʻgʻrisidagi statistik maʼlumotlar 2026-yil holatiga",
    paragraphs: [
      "Markaz faoliyati boʻyicha sudning qonuniy kuchga kirgan qarori asosida korrupsiyaviy huquqbuzarlik yoki jinoyat sodir etgan deb topilgan xodimlar toʻgʻrisidagi maʼlumotlar:",
    ],
    items: [
      "aniqlangan korrupsiyaviy huquqbuzarliklar — 12 ta;",
      "korrupsiyaga oid murojaatlar — 5 ta;",
      "oʻrganilgan murojaatlar — 5 ta;",
      "tasdiqlangan holatlar — 3 ta;",
      "koʻrilgan choralar — 3 nafari ishdan boʻshatildi, 4 nafari intizomiy, 1 nafariga tegishli tartibda jinoyat ishi qoʻzgʻatildi.",
    ],
  },
  {
    heading: "Korrupsiya haqida xabar berish aloqa kanallari",
    paragraphs: [
      "Jismoniy va yuridik shaxslar Markaz faoliyatida korrupsiya, manfaatlar toʻqnashuvi, mansab vakolatini suiisteʼmol qilish yoki boshqa korrupsiyaviy holatlar toʻgʻrisida quyidagi aloqa kanallari orqali xabar berishlari mumkin:",
    ],
    items: [
      "Markazning ishonch telefoni: 71-259-21-14;",
      "elektron pochta: markaz@davaktiv.uz;",
      "rasmiy veb-sayt: davijara.uz;",
      "murojaatlar uchun elektron tizim: @markaz_komplayens_bot;",
    ],
  },
  {
    heading: "Oʻtkazilgan tahlillar va jamoatchilik soʻrovlari",
    paragraphs: [
      "Markazda korrupsiyaviy xavf-xatarlarni aniqlash va baholash maqsadida faoliyat yoʻnalishlari, xizmat jarayonlari, davlat mulkidan foydalanish, ijara munosabatlari, davlat xaridlari, shartnomaviy munosabatlar va boshqa korrupsiyaviy xavfi yuqori boʻlgan jarayonlar tahlil qilib boriladi.",
      "Shuningdek, fuqarolar, tadbirkorlik subyektlari va boshqa manfaatdor shaxslarning fikr-mulohazalarini oʻrganish maqsadida jamoatchilik soʻrovlari, shu jumladan onlayn soʻrovnomalar oʻtkazilishi mumkin.",
      "Oʻtkazilgan soʻrovnomalar natijalari asosida aniqlangan muammolar va korrupsiyaviy xavf-xatarlarni kamaytirish boʻyicha tegishli choralar belgilanadi.",
    ],
  },
  {
    heading:
      "Korrupsiyaga nisbatan murosasiz munosabatni shakllantirishga qaratilgan targʻibot materiallari",
    paragraphs: [
      "Markaz tomonidan korrupsiyaning oldini olish, korrupsiyaga nisbatan murosasiz munosabatni shakllantirish va xodimlarning huquqiy savodxonligini oshirish maqsadida quyidagi targʻibot materiallari tayyorlandi va tarqatildi:",
    ],
    items: [
      "“Korrupsiyaga yoʻl qoʻymang!” mavzusidagi slaydlar;",
      "korrupsiyaning oldini olishga qaratilgan videoroliklar;",
      "maʼruzalar va taqdimot materiallari;",
      "buklet;",
      "manfaatlar toʻqnashuvining oldini olish boʻyicha eslatmalar;",
      "davlat xaridlarida korrupsiyaviy xavflarni kamaytirish boʻyicha materiallar;",
      "korrupsiya haqida xabar berish tartibi boʻyicha targʻibot materiallari.",
    ],
    closingParagraphs: [
      "Mazkur materiallar Markaz xodimlari va keng jamoatchilik oʻrtasida tarqatildi.",
    ],
  },
  {
    heading: "Seminar, trening, davra suhbatlari va boshqa tadbirlar",
    paragraphs: [
      "Markazda korrupsiyaga qarshi kurashish boʻyicha xodimlarning bilim va koʻnikmalarini oshirish maqsadida seminar, trening, davra suhbati va boshqa maʼrifiy tadbirlar tashkil etildi.",
    ],
    listIntro: "Tadbirlarning asosiy mavzulari:",
    items: [
      "korrupsiyaga qarshi kurashish qonunchiligi;",
      "manfaatlar toʻqnashuvi;",
      "davlat xaridlarida korrupsiyaviy xavflar;",
      "sovgʻa va manfaatlarni qabul qilishga oid cheklovlar;",
      "odob-axloq qoidalari;",
      "korrupsiyaga oid huquqbuzarliklar uchun javobgarlik;",
      "korrupsiya haqida xabar berish mexanizmlari;",
      "korrupsiyaviy xavflarni aniqlash va boshqarish;",
      "davlat xizmatchilarining halollik standartlari.",
    ],
  },
  {
    heading: "Korrupsiyaga qarshi ichki nazorat (komplaens) tizimi",
    paragraphs: [
      "Markazda korrupsiyaga qarshi ichki nazorat tizimi korrupsiyaviy xavf-xatarlarni aniqlash, baholash va boshqarish, korrupsiyaning oldini olish, manfaatlar toʻqnashuvini tartibga solish, xodimlarning korrupsiyaga qarshi qonunchilik talablariga rioya etishini taʼminlash hamda ichki nazorat mexanizmlarini takomillashtirishga qaratilgan.",
      "Korrupsiyaga qarshi ichki nazorat tuzilmasi tomonidan quyidagi yoʻnalishlarda ishlar amalga oshiriladi:",
    ],
    items: [
      "korrupsiyaviy xavf-xatarlarni aniqlash va baholash;",
      "korrupsiyaviy xavf-xatarlar xaritasini shakllantirish va yangilash;",
      "korrupsiyaga qarshi kurashish boʻyicha chora-tadbirlarning bajarilishini monitoring qilish;",
      "manfaatlar toʻqnashuvi holatlarini aniqlash va tartibga solish;",
      "xodimlarning korrupsiyaga qarshi cheklovlarga rioya etishini nazorat qilish;",
      "davlat xaridlarida korrupsiyaviy xavflarni oʻrganish;",
      "ichki hujjatlarning korrupsiyaga qarshi ekspertizasida ishtirok etish;",
      "korrupsiya xavfi yuqori boʻlgan lavozim va jarayonlarni aniqlash;",
      "xodimlarni korrupsiyaga qarshi kurashish boʻyicha oʻqitish;",
      "korrupsiyaga oid murojaatlarni oʻrganish;",
      "aniqlangan korrupsiyaviy xavflarni bartaraf etish yuzasidan takliflar kiritish;",
      "korrupsiyaga qarshi ichki nazorat tizimining samaradorligini baholash.",
    ],
  },
  {
    heading: "Korrupsiyaga qarshi kurashish sohasidagi xalqaro standartlar",
    paragraphs: [
      "Markaz korrupsiyaga qarshi kurashish tizimini takomillashtirishda xalqaro tajriba va xalqaro standartlarning asosiy tamoyillarini inobatga oladi.",
    ],
    listIntro: "Jumladan:",
    items: [
      "korrupsiyaning oldini olish;",
      "manfaatlar toʻqnashuvini boshqarish;",
      "shaffoflik va hisobdorlikni taʼminlash;",
      "korrupsiyaviy xavflarni baholash va boshqarish;",
      "ichki nazorat mexanizmlarini kuchaytirish;",
      "xodimlarning halollik va odob-axloq standartlariga rioya etishini taʼminlash;",
      "korrupsiya haqida xabar beruvchilar uchun xavfsiz aloqa kanallarini taʼminlash.",
    ],
    closingParagraphs: [
      "Markaz faoliyatida korrupsiyaga qarshi ichki nazorat tizimini takomillashtirishda ISO 37001 — “Korrupsiyaga qarshi boshqaruv tizimlari” xalqaro standartining tamoyillari va ilgʻor xalqaro tajribalarini joriy etish imkoniyatlari oʻrganib borilmoqda.",
    ],
  },
  {
    heading: "Ochiqlik va shaffoflik",
    paragraphs: [
      "Markaz korrupsiyaga qarshi kurashishning muhim sharti sifatida oʻz faoliyatining ochiqligi va shaffofligini taʼminlashga alohida eʼtibor qaratadi.",
      "Korrupsiyaga qarshi kurashish yoʻnalishidagi maʼlumotlar qonunchilikda belgilangan tartibda muntazam ravishda yangilanib boriladi.",
      "Jamoatchilik Markaz faoliyatidagi korrupsiyaga qarshi kurashish choralari, qabul qilingan ichki hujjatlar, amalga oshirilgan tadbirlar, tahlillar va boshqa ochiq maʼlumotlar bilan tanishishi mumkin.",
    ],
  },
  {
    heading: "Korrupsiyaga qarshi kurashish boʻyicha murojaat",
    paragraphs: [
      "Hurmatli fuqarolar va tadbirkorlik subyektlari!",
      "Agar Markaz xodimlari tomonidan korrupsiyaga oid huquqbuzarlik sodir etilayotganligi, noqonuniy manfaat talab qilinayotganligi, manfaatlar toʻqnashuvi mavjudligi yoki boshqa korrupsiyaviy holatga duch kelgan boʻlsangiz, bu haqda belgilangan aloqa kanallari orqali xabar berishingiz mumkin.",
      "Har bir murojaat belgilangan tartibda koʻrib chiqiladi.",
      "Korrupsiyaga qarshi kurashish — davlat organlari va tashkilotlarininggina emas, balki butun jamiyatning umumiy vazifasidir.",
    ],
  },
];

/** The document's closing line — bold in the source, rendered as a banner. */
export const closingStatement =
  "Korrupsiyaga befarq boʻlmang! Korrupsiya haqida xabar bering!";
