import type { Privilege } from "@/types/content";

/*
  The rent privileges, from the operator's list of 22.09.2026
  ("Davlat mulkini ijaraga berishda tadbirkorlik subyektlariga berilgan
  imtiyozlar toʻgʻrisida MAʼLUMOT", Imtiyozlar.xlsx — 29 rows).

  This module is the SEED, not the live list: the site reads the
  `privileges` table, which migration 15 replaced from this file (with a
  full before/after entry in the audit log). Later edits are made in
  /admin/imtiyozlar and do not come back here.

  STATUTORY TEXT — do not reword, reformat, summarise or machine-translate
  description / subject / duration / legalBasis. They are the spreadsheet's
  cells as written, with only these mechanical changes: non-breaking spaces
  made ordinary, cell line breaks in the one-line fields (basis, subject,
  duration) joined with a space, a merged cell's value applied to every row
  it spans, and three Cyrillic letters typed inside Latin words corrected
  (Хususiy -> Xususiy, Аlohida -> Alohida, 1-илова -> 1-ilova).

  `title`, `tag` and `category` are the site's own headings, not the
  statute's: the 22 privileges that were already listed keep theirs, and the
  seven new ones (rows 1-7) were given one each. Editable in
  /admin/imtiyozlar.
*/

export const privileges: Privilege[] = [
  {
    id: 1,
    category: "boshqa",
    tag: "Hunarmandchilik",
    title: "Hunarmandlarga aholi gavjum joylarda 50% pasaytirilgan stavka",
    description:
      "Hunarmandlarga mehmonxonalar, bozorlar, mahalla guzarlari va shu kabi aholi gavjum boʻladigan boshqa joylarda davlat koʻchmas mulk obyektlaridan joylarni 50 foizga pasaytirilgan stavkada elektron onlayn auksion orqali hunarmandchilik faoliyati uchun realizatsiya qilish.",
    subject:
      "Barcha tadbirkorlik subyektlariga, xorijiy ish beruvchilar va ta’lim tashkilotlariga",
    duration: "Doimiy",
    legalBasis: "VM–660 14.12.2023 y (18.2. va 18.3.-bandlari)",
  },
  {
    id: 2,
    category: "boshqa",
    tag: "Hududiy dasturlar",
    title:
      "Munitsipal koʻchmas mulkni eng kam stavkada uzoq muddatga ijaraga berish",
    description:
      "Qoraqalpogʻiston Respublikasi Vazirlar Kengashi, viloyatlar hamda tuman (shahar) hokimliklari tomonidan hududi oʻn ming kvadrat metrdan, baholangan qiymati bazaviy hisoblash miqdorining besh ming baravari miqdoridan oshmagan hamda olti oy davomida sotilmagan mahalliy ijro etuvchi hokimiyat organlariga tegishli boʻlgan munitsipal koʻchmas mulk obyektlari (Nukus shahri, viloyatlar va tuman (shahar) markazlari hamda Toshkent shahri tumanlari bundan mustasno) ikki yil ichida ishlab chiqarish, xizmat koʻrsatish va servis sohalarida yangi loyihalarni ishga tushirish va yangi ish oʻrinlarini yaratish sharti bilan ijara toʻlovining eng kam stavkalari asosida:\n\ntadbirkorlik subyektlariga toʻgʻridan-toʻgʻri oʻn yil muddatga;\n\nxalqaro tan olingan xorijiy til va malaka sertifikatlarini olishga oʻqitadigan mahalliy hamda xorijiy mutaxassislar yoki tashkilotlarga dastlabki yil ijara toʻlovi undirmasdan, besh yil muddatga keyinchalik uning muddatni uzaytirish sharti bilan ijaraga beriladi.",
    subject:
      "Barcha tadbirkorlik subyektlariga, xorijiy ish beruvchilar va ta’lim tashkilotlariga",
    duration: "10 yilgacha",
    legalBasis: "VM–660 14.12.2023 y (18.2. va 18.3.-bandlari)",
  },
  {
    id: 3,
    category: "boshqa",
    tag: "Davlat tashkilotlari",
    title: "Budjet tashkilotlari va xalqaro tashkilotlarga tekin foydalanish",
    description:
      "Budjetdan moliyalashtiriladigan davlat muassasalari va ularning hududiy va tuman (shahar) boʻlinmalari, shuningdek, xalqaro tashkilotlar vakolatxonalari, qoʻshma loyihalarni amalga oshirish guruhlari davlat mulki boʻlgan binolar va inshootlarga tekin foydalanish huquqi asosida joylashtiriladi",
    subject:
      "Byudjetdan moliyalashtiriladigan davlat muassasalari va ularning hududiy va tuman (shahar) boʻlinmalari, shuningdek, xalqaro tashkilotlar vakolatxonalari, qoʻshma loyihalarni amalga oshirish guruhlari",
    duration: "Doimiy",
    legalBasis: "VM–660 14.12.2023 y (4-bandi)",
  },
  {
    id: 4,
    category: "boshqa",
    tag: "Barcha tadbirkorlar",
    title: "Yillik ijara toʻlovini bir oyda toʻlaganlarga chegirma",
    description:
      "ijara shartnomasi tuzilgan kundan boshlab ijaraga oluvchi tomonidan yillik ijara toʻlovlari bir oy davomida toʻlangan taqdirda, unga yillik ijara summasidan mazkur shartnoma tuzilgan sanadagi Markaziy bankning asosiy stavkasi miqdorida chegirma beriladi, bundan chegirma qoʻllamaslik sharti bilan ijaraga berilgan hamda bir yildan kam muddatga tuzilgan va boshqa imtiyozlar qoʻllangan ijara shartnomalari mustasno.",
    subject: "Barcha tadbirkorlik subyektlari",
    duration: "Doimiy",
    legalBasis: "PF-70 21.04.2025-y. (8-band, “a”-kichik band)",
  },
  {
    id: 5,
    category: "boshqa",
    tag: "Barcha tadbirkorlar",
    title: "Olti oy ijaraga berilmagan obyektlar narxini 50% pasaytirish",
    description:
      "olti oy davomida elektron onlayn auksion savdolarida ijaraga berilmagan obyektlarning boshlangʻich narxi 50 foiz pasaytirilgan qiymatda belgilanadi. Bunda boshlangʻich narx pasaytirilganda ham ijaraga berilmasa, ushbu auksion unda bir ishtirokchi qatnashgan taqdirda ham, istisno tariqasida, oʻtkazilgan deb hisoblanadi.",
    subject: "Barcha tadbirkorlik subyektlari",
    duration: "Doimiy",
    legalBasis: "PF-70 21.04.2025-y. (8-band, “b”-kichik band)",
  },
  {
    id: 6,
    category: "boshqa",
    tag: "Barcha tadbirkorlar",
    title: "Sanoat zonalarida ijara toʻlovini 24 oyga boʻlib toʻlash",
    description:
      "Sanoat zonalarida bino va inshootlarni elektron onlayn auksion orqali ijaraga berishda toʻlovlarni yigirma toʻrt oy muddatda boʻlib-boʻlib toʻlashga ruxsat beriladi.",
    subject: "Barcha tadbirkorlik subyektlari",
    duration: "Doimiy",
    legalBasis: "PF-70 21.04.2025-y. (3-band)",
  },
  {
    id: 7,
    category: "talim",
    tag: "Ta'lim muassasalari",
    title:
      "Kasbiy koʻnikmalar markazlari binolarini oʻqitish kurslari uchun berish",
    description:
      "Kasbiy ko‘nikmalar markazlarining bino-inshootlari yoki ularning bir qismini jihozlari bilan birga ularda kasb-hunar va xorijiy tillarga o‘qitish kurslarini tashkil qilish uchun xorijiy ish beruvchilar va ta’lim tashkilotlariga to‘g‘ridan-to‘g‘ri shartnomalar bo‘yicha tekin foydalanishga yoki uzoq muddatli ijaraga berish",
    subject: "Xorijiy ish beruvchilar va ta’lim tashkilotlariga",
    duration: "Doimiy",
    legalBasis: 'PQ–347 10.10.2024 y (9-band "v" kichik bandi)',
  },
  {
    id: 8,
    category: "talim",
    tag: "Ta'lim muassasalari",
    title: "Xususiy o'quv markazlariga sinf xonalaridan bepul foydalanish",
    description:
      "Umumiy oʻrta taʼlim muassasalarining sinf xonalarini taʼlim jarayonidan boʻsh vaqtda kasb-hunar va xorijiy tillarni oʻqitish faoliyatini amalga oshirish uchun toʻgʻridan-toʻgʻri shartnomalar asosida tekin foydalanish huquqi bilan xususiy oʻquv markazlariga beriladi.",
    subject: "Xususiy o‘quv markazlari",
    duration: "Doimiy",
    legalBasis: "PQ-239 27.06.2024 y. (3-bandi)",
  },
  {
    id: 9,
    category: "it",
    tag: "IT va innovatsiya",
    title: "IT-park va raqamli texnologiyalar tashkilotlariga bepul bino",
    description:
      "IT-parkning tavsiyanomasiga asosan bo‘sh turgan davlat ko‘chmas mulk obyektlari, Raqamli texnologiyalar vazirligi tizimidagi tashkilotlari hamda IT-park filiallarining davlat mulki bo‘lgan bo‘sh binolari va maydonlari (xonalari) bir yilgacha muddatga tekin foydalanish huquqi asosida beriladi.",
    subject:
      "IT-xizmatlar eksport qiluvchi korxonalarni keng jalb qilishga qaratilgan dastur ishtirokchilariga",
    duration: "1-yil muddatga",
    legalBasis: "PQ-87 26.02.2024 y. (2-bandi)",
  },
  {
    id: 10,
    category: "it",
    tag: "IT va innovatsiya",
    title: "Dastur muddati tugagach to'g'ridan-to'g'ri ijara shartnomasi",
    description:
      "Dasturda ishtirok etuvchi korxonalarga davlat mulki obyektiga bir yil muddatga tuzilgan tekin foydalanish shartnomasi muddatti tugagandan so‘ng Dasturda ishtirok etuvchi korxonalar bilan ularga tekin foydalanish huquqi asosida berilgan bino va maydonlar (xonalar) yuzasidan “E-auksion” elektron savdo platformasida bir metr kvadrat maydon uchun tegishli hudud bo‘yicha shakllangan o‘rtacha ijara haqi miqdorida to‘g‘ridan-to‘g‘ri shartnoma tuziladi.",
    subject:
      "IT-xizmatlar eksport qiluvchi korxonalarni keng jalb qilishga qaratilgan dastur ishtirokchilariga",
    duration: "Doimiy",
    legalBasis: "PQ-87 26.02.2024 y. (2-bandi)",
  },
  {
    id: 11,
    category: "it",
    tag: "IT va innovatsiya",
    title: "Malaka oshirish uchun eng kam stavkada ijara",
    description:
      "Hududlarda bo‘sh turgan va bir yildan buyon auksion savdolarida sotilmasdan turgan davlat mulki bo‘lgan bino-inshootlar, shuningdek, kasb-hunar kollejlarining foydalanilmasdan bo‘sh turgan binolari Dastur ishtirokchilariga o‘z xodimlarini o‘qitish va malakasini oshirish hamda “amaliy monomarkaz” tashkil qilish uchun foydalanishga tanlov (talabgor yagona bo‘lganda — to‘g‘ridan-to‘g‘ri shartnoma) asosida ijara stavkasining minimal miqdori bo‘yicha ijaraga beriladi.",
    subject:
      "“20 ming tadbirkor — 500 ming malakali mutaxassis” dasturi ishtirokchilariga ijaraga beriladi",
    duration: "Doimiy",
    legalBasis: "PF-93 12.06.2023 y. (7-band 12-xatboshi)",
  },
  {
    id: 12,
    category: "boshqa",
    tag: "Hunarmandchilik",
    title: "Hunarmandlarga madaniy meros obyektlari 50% chegirma bilan",
    description:
      "Madaniy meros obyektlarini hunarmandlarga ijaraga berishda auksionga chiqariladigan boshlang‘ich narx amaldagi stavkaga nisbatan 50 foiz miqdorida belgilanadi.",
    subject: "Hunarmandlar",
    duration: "Doimiy",
    legalBasis: "PF-91 12.06.2023 y. (10-band 4-xatboshi)",
  },
  {
    id: 13,
    category: "boshqa",
    tag: "Sport",
    title: "Xususiy shaxmat klublariga bepul joy",
    description:
      "Xususiy shaxmat klublariga ular tomonidan shaxmat to‘garaklarini tashkil etish va aholiga xizmat ko‘rsatish uchun davlat mulki ob’ektlari va hududlardagi “Yoshlar markazlari”dan ijara to‘lovlarisiz (kommunal to‘lovlar bundan mustasno) joy ajratiladi.",
    subject: "Xususiy shaxmat klublariga",
    duration: "2024-yil 1-yanvardan boshlab",
    legalBasis: "PQ-150-son 08.05.2023-y (10-band)",
  },
  {
    id: 14,
    category: "boshqa",
    tag: "Hududiy dasturlar",
    title: "Kasanachilarni jalb qilganlar uchun 50% chegirma",
    description:
      "Kasanachilarni jalb qilgan tadbirkorlik subyektlariga davlat mulki obyektlarini ijara to‘lovlarini 50 foizga kamaytirgan holda ijaraga beriladi.",
    subject: "Kasanachilarni jalb qilgan tadbirkorlik subyektlariga",
    duration: "Doimiy",
    legalBasis: "PQ-70-son 23.02.2023 y. (2-ilova)",
  },
  {
    id: 15,
    category: "boshqa",
    tag: "Hududiy dasturlar",
    title: "Hudud toifasiga qarab boshlang'ich narxni 50% pasaytirish",
    description:
      "Tadbirkorlik faoliyatini tuman va shaharlarning toifalaridan kelib chiqib, qo‘llab-quvvatlash choralari 3-ilovaga muvofiq Tadbirkorlik subyektlariga davlat mulki obyektlarini ijaraga berishda auksionga chiqariladigan boshlang‘ich narxni belgilash (amaldagi stavkaga nisbatan) 50 foizga tushiriladi.",
    subject: "Barcha tadbirkorlik subyektlari",
    duration: "Doimiy",
    legalBasis: "PQ-287 30.12.2022 y. (4-band 2-xatboshi)",
  },
  {
    id: 16,
    category: "ijtimoiy",
    tag: "Ijtimoiy himoya",
    title: "«Ayollar daftari»dagi xotin-qizlarni ishga qabul qilganda chegirma",
    description:
      '"Ayollar daftari"ga kiritilgan ishsiz xotin-qizlarni ishga qabul qilganda umumiy ijara maydoniga nisbatan ijara to‘lovlaridan 50 foiz miqdorida imtiyoz beriladi.',
    subject: "Barcha tadbirkorlik subyektlari",
    duration: "Doimiy",
    legalBasis: "PQ-376 21.09.2022 y. (1-ilova)",
  },
  {
    id: 17,
    category: "ijtimoiy",
    tag: "Ijtimoiy himoya",
    title: "Xotin-qizlar ustunlik qiladigan korxonalar uchun 5 yillik ozodlik",
    description:
      'Ishlab chiqarish sohasida faoliyat yuritayotgan va xodimlar umumiy sonining kamida 70 foizi "Ayollar daftari"ga kiritilgan xotin-qizlar bo‘lgan, davlat mulki obyektlari uchun ijara haqi to‘lovidan 5 yilga ozod etiladi.',
    subject: "Ishlab chiqarish bilan shug‘ullanuvchi tadbirkorlik subyektlari",
    duration: "5 yilgacha",
    legalBasis: "PQ-376 21.09.2022 y. (1-ilova)",
  },
  {
    id: 18,
    category: "boshqa",
    tag: "Sport",
    title: "Olimpiya g'oliblari tashkil etgan sport muassasalariga chegirma",
    description:
      "Yozgi Olimpiya va Paralimpiya o‘yinlarida g‘olib hamda sovrindor bo‘lgan sportchilar tomonidan tashkil etilgan nodavlat sport-ta’lim muassasasi faoliyatini olib borish uchun davlat tasarrufida bo‘lgan zarur bino va inshootlarni 2024-yil 1-yanvardan 2026-yil 1-yanvarga qadar nodavlat sport-ta’lim muassasasi tomonidan jismoniy tarbiya va sport xizmatlarini ko‘rsatish uchun foydalaniladigan bino va inshootlar ijara to‘lovi xarajatlarini 50 foizga kamaytiriladi.",
    subject: "Nodavlat sport-ta’lim muassasalari",
    duration: "2024 yil 1 yanvardan 2026 yil 1 yanvarga qadar",
    legalBasis: "PQ-302 01.07.2022 y. (1.2,-1.3 bandlar)",
  },
  {
    id: 19,
    category: "boshqa",
    tag: "Sport",
    title: "Mahallada sport to'garaklari uchun 50% eng kam stavka",
    description:
      "Sport to‘garaklarini tashkil etish uchun mahallada bo‘sh turgan davlat mulki hisoblangan bino va inshootlar elektron savdolar o‘tkazmagan holda, ushbu obyektga nisbatan belgilangan eng kam ijara to‘lovi stavkasining 50 foizi miqdorida ijaraga berish.",
    subject: "Barcha tadbirkorlik subyektlari",
    duration: "Doimiy",
    legalBasis: "PQ-92 19.01.2022 y. (1-ilovasi 9-bandi)",
  },
  {
    id: 20,
    category: "boshqa",
    tag: "Sport",
    title: "Sportchi-murabbiylarga to'garak tashkil etish uchun imtiyoz",
    description:
      "Olimpiya va Paralimpiya hamda Osiyo va Paraosiyo o‘yinlari, jahon, Osiyo va respublika chempionatlarida oxirgi 5 yilda g‘olib va sovrindor (1 — 3 o‘rin) bo‘lgan sportchi-trenerlarga, shuningdek, olis va chekka hududlarda faoliyat yurituvchi sportchi-trenerlarga sport to‘garaklarini tashkil etish uchun tuman va shaharlarda bo‘sh turgan davlat mulki hisoblangan bino va inshootlar elektron savdolar o‘tkazmagan holda, ushbu obyektga nisbatan belgilangan eng kam ijara to‘lovi stavkasining 50 foizi miqdorida ijaraga beriladi.",
    subject:
      "Olimpiya va Paralimpiya hamda Osiyo va Paraosiyo o‘yinlari, jahon, Osiyo va respublika chempionatlarida oxirgi 5 yilda g‘olib va sovrindor (1 — 3 o‘rin) bo‘lgan sportchi-trenerlarga, shuningdek, olis va chekka hududlarda faoliyat yurituvchi sportchi-trenerlarga",
    duration: "Doimiy",
    legalBasis: "PF-6260 13.07.2021 (13-band)",
  },
  {
    id: 21,
    category: "ijtimoiy",
    tag: "Ijtimoiy himoya",
    title: "«Yoshlar daftari»dagi yoshlarni ishga qabul qilganda chegirma",
    description:
      "Yoshlar daftariga kiritilgan ishsiz yoshlarni ishga qabul qilganda umumiy ijara maydoniga nisbatan ijara to'lovlaridan 50 foiz miqdorda imtiyoz beriladi.",
    subject: "Barcha tadbirkorlik subyektlari",
    duration: "Doimiy",
    legalBasis: "PF-6208 20.05.2021 y. (1-band)",
  },
  {
    id: 22,
    category: "ijtimoiy",
    tag: "Ijtimoiy himoya",
    title: "Yoshlar ustunlik qiladigan korxonalar uchun 5 yillik ozodlik",
    description:
      'Ishlab chiqarish sohasida faoliyat yuritayotgan va xodimlar umumiy sonining kamida 70 foizi "Yoshlar daftari"ga kiritilgan yoshlar boʼlgan, davlat mulki obyektlari uchun ijara haqi toʼlovidan 5 yilga ozod etiladi.',
    subject: "Ishlab chiqarish bilan shugʼullanuvchi tadbirkorlik subyektlari",
    duration: "5 yilgacha",
    legalBasis: "PF-6208 20.05.2021 y. (1-band)",
  },
  {
    id: 23,
    category: "talim",
    tag: "Ta'lim muassasalari",
    title: "Bog'cha oshxonasidan bepul foydalanish (autsorsing)",
    description:
      "Davlat maktabgacha ta’lim tashkilotida ovqatlantirish autsorsing usulida tashkil etilganda, ijara shartnomasi doirasida autsorsyerga vaqtincha foydalanishga beriladigan oshxonaning ishlab chiqarish xonalari, asbob-uskunalari, idish-tovoqlari va mebelidan foydalanganlik uchun tekin foydalanish huquqi asosida berilishi belgilanadi.",
    subject: "Autsorsing usulida tashkil etilgan tadbirkorlik subyektlari",
    duration: "Doimiy",
    legalBasis: "VM-626-son 25.07.2019 y. (5-band 3-xatboshi)",
  },
  {
    id: 24,
    category: "ijtimoiy",
    tag: "Ijtimoiy himoya",
    title: "Nogironligi bo'lgan shaxslar uchun 50% chegirma",
    description:
      "Davlat mulkini ijaraga olgan alohida toifadagi (nogironligi mavjud yoki hodimlari tarkibining koʼproq qismi nogironlarni tashkil etuvchi) tadbirkorlik subyektlariga ijara toʼlovini ushbu obyektga nisbatan auksion savdolari natijalari boʼyicha belgilangan ijara toʼlovining 50 foizi miqdorida belgilash.",
    subject:
      "Alohida toifadagi tadbirkorlik subyektlari (nogironligi bor yoki nogirolarni ishga qabul qilgan tadbirkorlik subyektlari)",
    duration: "Doimiy",
    legalBasis: "PQ-3782 11.06.2018 y. (1-band)",
  },
  {
    id: 25,
    category: "ijtimoiy",
    tag: "Ijtimoiy himoya",
    title:
      "Yosh tadbirkorlarga ishlab chiqarish maydonlaridan bepul foydalanish",
    description:
      'O‘zbekiston yoshlar ittifoqi a’zosi bo‘lgan yosh tadbirkorlarga "Yoshlar ishlab chiqarish klasterlari" hududida joylashgan ishlab chiqarish maydonlari korxona tashkil topguniga qadar, ammo 5 yildan ko‘p bo‘lmagan muddatga tekin foydalanish huquqi asosida beriladi',
    subject: "O‘zbekiston yoshlar ittifoqi a’zosi bo‘lgan yosh tadbirkorlar",
    duration: "5 yilgacha",
    legalBasis: "VM-834 16.10.2017 y. (5-band)",
  },
  {
    id: 26,
    category: "ijtimoiy",
    tag: "Ijtimoiy himoya",
    title: "Yoshlar ittifoqi so'roviga ko'ra bo'sh mulkdan bepul foydalanish",
    description:
      "O‘zbekiston yoshlar ittifoqi a’zosi bo‘lgan yosh tadbirkorlarga erkin iqtisodiy va kichik sanoat zonalari hududida joylashgan davlat mulki O‘zbekiston yoshlar ittifoqining shahar hamda tuman kengashlarining iltimosiga ko‘ra 5 yildan ko‘p bo‘lmagan muddatga tekin foydalanish huquqi asosida beriladi.",
    subject: "O‘zbekiston yoshlar ittifoqi a’zosi bo‘lgan yosh tadbirkorlar",
    duration: "5 yilgacha",
    legalBasis: "VM-834 16.10.2017 y. (5-band)",
  },
  {
    id: 27,
    category: "boshqa",
    tag: "Hududiy dasturlar",
    title: "Navoiy viloyati chekka tumanlarida 10 yilgacha bepul foydalanish",
    description:
      "Navoiy viloyatining Tomdi, Uchquduq, Konimex, Nurota tumanlari va Zarafshon shahrida joylashgan foydalanilmay boʼsh yotgan davlat obyektlarini ushbu obyektlar negizida tadbirkorlik faoliyatini yoʼlga qoʼyish istagini bildirgan tadbirkorlik subyektlariga yangi ish oʼrinlari yaratish sharti bilan oʼn yil muddatgacha tekin foydalanish huquqi asosida beriladi.",
    subject: "Barcha tadbirkorlik subyektlari",
    duration: "10 yilgacha",
    legalBasis: "PQ-3301 29.09.2017 y. (9-band)",
  },
  {
    id: 28,
    category: "boshqa",
    tag: "Hunarmandchilik",
    title: "Madaniy meros obyektlariga investitsiya evaziga 80% ozodlik",
    description:
      "Moddiy madaniy meros obyektlarini investitsiya kiritish sharti bilan ijaraga olgan tadbirkorlik subyektlari ular bilan shartnoma tuzilgan kundan boshlab besh yil muddatga ijara to‘lovining hisoblab chiqilgan qiymatining 80 foizi miqdorida ijara to‘lovini to‘lashdan ozod etish.",
    subject:
      "Moddiy madaniy meros obyektlarini investitsiya kiritish sharti bilan olgan tadbirkorlik subyektlari",
    duration: "Doimiy",
    legalBasis: "VM-53 06.03.2014 y. (1-ilova, 32-band)",
  },
  {
    id: 29,
    category: "talim",
    tag: "Ta'lim muassasalari",
    title:
      "Tugatilayotgan bog'chalar binosini nodavlat bog'chalarga ijaraga berish",
    description:
      "Tugatilayotgan davlat maktabgacha ta’lim tashkilotlarining bo‘shayotgan binolari va inshootlari mavjud jihozlari va asbob-uskunalari bilan birgalikda, keyinchalik sotib olish huquqi bilan 3 yilgacha muddatga ijara haqi undirmasdan nodavlat maktabgacha ta’lim tashkilotlariga ijaraga berish.",
    subject: "Barcha tadbirkorlik subyektlari",
    duration: "3 yilgacha",
    legalBasis: "VM-313-son 24.06.1999 y. (2-bandi)",
  },
];
