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

- **The listings feed cannot say whether bidding is OPEN.** It carries an
  auction START timestamp and a `lot_status`, and neither moves while the
  auction runs: on 16.09.2026, with lot 25472672 in its e-auksion room, the
  feed still reported `lot_status: "Savdoda ishtirok etish uchun elektron
  arizalarni qabul qilish"` and `order_status: "Lotga chiqarilgan"` — the same
  values a lot whose auction is next week carries. There is no end timestamp
  either, and a room closes minutes after it opens. Deriving "live" from the
  auction's own Tashkent day put 48 pins in the live state nationwide on a day
  when exactly 1 rent lot was actually being bid on. `lib/data/live-auctions.ts`
  therefore reads e-auksion's public `POST /api/front/curlots` with
  `confiscant_groups_id: 11` — the list behind its own "Lotlar → Joriy
  savdolar" page — and a fault there means no lot is marked live, never all
  of them.
- **`GET /api/front/lots/current` is the WRONG live list.** It looks right —
  it is e-auksion's own "Joriy savdolar" homepage block — but it carries no
  rent lots. On 21.09.2026 at 10:05, with 167 of our lots scheduled for 10:00,
  it listed 8 rooms (seven vehicles and a flat, all confiscated property) and
  none of ours, while `curlots` for group 11 listed 64, 57 of them ours. Our
  lots are group 11, category 41 "Davlat mulkini ijaraga berish". The portal's
  page also sends a `zz_md5` field; the endpoint answers identically without
  it and it is not reconstructed.
- **`curlots` is TODAY's list, not the open rooms.** At 04:33 on 22.09.2026
  it listed 49 group-11 lots, all `auction_date_str` "22.09.2026 10:00",
  `lot_statuses_id` 10 — and the site showed all of them as live. A row now
  counts as live only once its own `auction_date_str` (Tashkent, UTC+5) has
  passed. Still unmeasured: whether a finished room LEAVES the list before the
  day ends — check the list and its statuses after 10:00 before relying on it.

- **Contract rows and building names (/ijara-shartnomalari).** The register's
  `list-reg` endpoint returns every contract of one region's year — `region`
  is REQUIRED there, so the republic is 14 calls (7.4 MB), held in memory an
  hour (`lib/data/lease-contracts.ts`). Its rows sum to the summary exactly
  (29 680 on 21.09.2026) — and so does area: 198,9 mln m² by then, both ways.
  An object is a `cad_number`; there is no name in the register, so names come
  from the cadastre, one call per number, cached in `cadastre_objects`. The
  Markaz gateway (`CADDATA_*`, `markaz/cad_data`) needs the HOLDER's STIR as
  `tin` (2108 otherwise, 2109 without one) and the register sends none, so
  until the operator adds it the older `otchet.davbaho.uz` service answers
  instead. **Both responses carry owners' personal data — `hosts[]` (PINFL,
  birth date, gender) and `subjects[]` (passport, PINFL) — never read, stored
  or shown**; only the name and address are. The older service's token rides
  in the query string over plain HTTP, so no URL is ever logged. Dates are typed —
  three are in the future — so the list orders by `contract_id`, not date.

- **No bid count exists.** Neither service reports how many raises a lot took —
  there is no bid history, participant count or step field anywhere in either
  response. The sold-lot card shows the rise from the start price instead,
  which is arithmetic on two published figures. The raises DO land on a
  10%-of-start grid in 906 of 997 sales, so a step count could be
  reverse-engineered; 91 sales do not fit it, so it is not printed.

- **Listing photos** — the legacy page showed one hotlinked image on all three
  cards. Cards render a branded placeholder until real self-hosted photography
  exists; `aspect-video` reserves the box so adding images causes no shift.
