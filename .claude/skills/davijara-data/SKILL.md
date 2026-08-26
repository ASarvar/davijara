---
name: davijara-data
description: Known quirks of the upstream services behind davijara.uz — the listings feed, the rent-contracts register and the order/photo endpoint — including the figures that must not be derived and the personal data that must never reach a page. Load BEFORE touching lib/data/*, hero statistics, or anything that reads an API.
---

## Known source-data issues

Carried over from the legacy site and resolved as follows:

- **Address** — `index.html` said "Buxoro ko'chasi 6", `imtiyozlar.html` said
  "Islom Karimov ko'chasi 55". Confirmed as **Buxoro ko'chasi 6**; single
  source of truth in `content/site.ts`.
- **Footer links** — the two pages listed different domains. Reconciled;
  `online-yanki.uz` dropped (does not resolve), `e-auktsion.uz` normalised to
  `e-auksion.uz`.
- **Regions** — the legacy map array had 13 entries while the hero claimed 14.
  Toshkent shahri was missing; added.
- **Statistics** — all four hero cards are now LIVE and all four follow
  `?hudud=` and `?tuman=`. Open lots and lots sold this year
  (`sold_price > 0`) come from the listings feed; signed contracts and leased
  area come from `RENT_CONTRACTS_API_URL`, a second service whose `region` is
  optional (omit it for the republic). Each degrades on its own: the first two
  fall back to the verified static figures, and the sold card is dropped rather
  than shown empty because nobody has published that number.
  **Do not derive a leased-AREA figure from the listings feed's `rent_area`.**
  Summed over 2026 it gives 161 mln m², with one region alone contributing 150
  mln from 266 lots (~564 000 m² each) — the field is not comparable across lot
  types. The register's `total_rental_area` is the figure to use; it reports
  148,8 mln m² nationally against the operator's static 145,9.

- **District figures across the two services.** The register identifies
  districts by a code (1718203) and a Cyrillic abbreviation ("Оқдарё т."); the
  listings feed sends a Latin name and no code ("Oqdaryo tumani"). Until the
  operator adds a district code to the listings feed, `rent-contracts.ts`
  bridges them by name: transliterate, match exactly, then within two edits
  when exactly one candidate is that close, and refuse anything ambiguous.
  Measured over all fourteen regions — 196 districts carrying lots — 183 match
  exactly, 13 near, none by guesswork. An unmatched district widens to the
  region and the hero says so.
- **The order endpoint returns PERSONAL DATA.** `winner_name`,
  `winner_passport`, `winner_pinfl`, `winner_phone` and `winner_address` come
  back for every concluded lot. None of it is on any type in `types/content.ts`
  and none of it may reach a page. The sale is public; the buyer is not.
  `lib/data/lot-images.ts` reads only `images[]` from that response, and
  `SoldLot` carries only prices, area and place.

- **No bid count exists.** Neither service reports how many raises a lot took —
  there is no bid history, participant count or step field anywhere in either
  response. The sold-lot card shows the rise from the start price instead,
  which is arithmetic on two published figures. The raises DO land on a
  10%-of-start grid in 906 of 997 sales, so a step count could be
  reverse-engineered; 91 sales do not fit it, so it is not printed.

- **Listing photos** — the legacy page showed one hotlinked image on all three
  cards. Cards render a branded placeholder until real self-hosted photography
  exists; `aspect-video` reserves the box so adding images causes no shift.
