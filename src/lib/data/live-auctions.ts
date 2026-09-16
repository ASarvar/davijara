import "server-only";

/*
  Which lots are being bid on RIGHT NOW.

  ANSWERED BY E-AUKSION, NOT INFERRED HERE. This started as a derivation from
  the listings feed — a lot counted as live from its auction timestamp until
  the end of that Tashkent day, because the feed carries no end time and no
  in-progress flag. The window was far too generous: an e-auksion room closes
  minutes after it opens (its own page counts down in mm:ss), so a lot that
  finished at 10:12 stayed marked as live until midnight. Checked against the
  service on 16.09.2026 while lot 25472672 was in its room, our own feed still
  reported `lot_status: "Savdoda ishtirok etish uchun elektron arizalarni
  qabul qilish"` and `order_status: "Lotga chiqarilgan"` — the same values a
  lot whose auction is next week carries. Our feed only moves to
  "Auksion/Tanlov yakunlandi" after the fact, so it cannot answer this either.

  So we read the list the portal itself publishes — the one behind the "Joriy
  savdolar" block on e-auksion.uz:

    GET https://e-auksion.uz/api/front/lots/current?lang=uz
    → { total, rows: [ { id, lot_number, name, auction_date_str, … } ] }

  PUBLIC AND UNAUTHENTICATED, unlike the internal services the rest of
  lib/data talks to. It is read server-side all the same: the browser cannot
  reach it across origins, and one cached fetch serves every reader.

  A FAULT MEANS "NOBODY IS LIVE", never "everybody is". `null` is returned for
  anything unexpected — a timeout, a non-200, a body that is not the shape
  above — and the caller shows no live state at all. Marking an auction as
  open when it has closed invites a citizen to a room they cannot bid in;
  missing one costs them a link they can still reach through the lot page.
*/

const CURRENT_LOTS_URL =
  process.env.EAUKSION_CURRENT_LOTS_URL ??
  "https://e-auksion.uz/api/front/lots/current?lang=uz";

/*
  30 seconds. The rooms turn over in minutes, so a longer cache would show
  finished auctions — the bug this module exists to fix — and a shorter one
  would add requests nobody can perceive the benefit of.
*/
const REVALIDATE_SECONDS = 30;

type CurrentLotsResponse = {
  total?: number;
  rows?: { id?: number | string; lot_number?: string | number }[];
};

/**
 * Lot numbers whose bidding room is open, or `null` if the list cannot be
 * read. Numbers only — this call is about WHICH lots, and everything else
 * about a lot already comes from our own feed.
 */
export async function getLiveAuctionLots(): Promise<string[] | null> {
  try {
    const res = await fetch(CURRENT_LOTS_URL, {
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(8_000),
      next: { revalidate: REVALIDATE_SECONDS },
    });
    if (!res.ok) {
      throw new Error(`Current-lots endpoint responded ${res.status}`);
    }

    const json = (await res.json()) as CurrentLotsResponse;
    if (!Array.isArray(json.rows)) {
      throw new Error("Current-lots response carried no rows array");
    }

    /*
      `lot_number` is what our own listings carry, and `id` repeats it in the
      responses seen so far — kept as a fallback, but neither is trusted to be
      a number: anything that is not a plain lot id is dropped rather than
      passed to the browser.
    */
    const lots = new Set<string>();
    for (const row of json.rows) {
      const raw = String(row.lot_number ?? row.id ?? "").trim();
      if (/^\d{1,18}$/.test(raw)) lots.add(raw);
    }
    return [...lots];
  } catch (error) {
    console.warn(
      "[live-auctions] current lots unavailable:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
