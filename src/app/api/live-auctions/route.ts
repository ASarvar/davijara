import {
  getLiveAuctionListings,
  getLiveAuctionLots,
} from "@/lib/data/live-auctions";

/*
  The open bidding rooms, for the map.

  The browser cannot ask e-auksion directly — it is another origin, and it
  sends no CORS headers — so the server asks once and every reader is served
  from the same cached answer. See lib/data/live-auctions.ts for why this is
  read from e-auksion at all rather than derived from our own feed.

  Not locale-prefixed: `src/proxy.ts` excludes `api` from its matcher. Under a
  base path it is served at `<base>/api/live-auctions`, which is why the map
  builds the URL with `withBasePath()`.
*/

/*
  DYNAMIC, NOT A 30-SECOND PAGE CACHE. It used to be `revalidate = 30`, and
  that is stale-while-revalidate: the first request after the window gets the
  OLD answer while a new one is built — so a reader polling every 30 seconds
  could be shown a list up to a minute old, and the tab and the strip beside
  it disagreed (17 against 21 on one screen). The upstream list is still read
  at most once every 30 seconds — `unstable_cache` in lib/data/live-auctions.ts
  holds it — so rendering this per request costs e-auksion nothing more.
*/
export const dynamic = "force-dynamic";

export async function GET() {
  const lots = await getLiveAuctionLots();

  /*
    UNKNOWN IS NOT EMPTY. A 200 with `[]` would tell the map "no auction is
    open", which is a claim; 503 tells it "no answer", and the map keeps
    whatever it last knew rather than blinking every pin back to plain navy on
    one bad response.
  */
  if (!lots) {
    return Response.json(
      { lots: [] },
      { status: 503, headers: { "Cache-Control": "no-store" } },
    );
  }

  /*
    `listed` is how many of those rooms are for lots in OUR feed — the number
    the homepage strip, the explorer's live tab and the menu entry all decide
    on. `lots` alone overstates it: e-auksion also runs sales that are not
    ours. Both calls are cached (30 s upstream, minutes for the feed), so the
    second costs nothing a reader would notice.
  */
  const listed = (await getLiveAuctionListings()).length;

  /*
    `no-store` for the browser too: the page polls every 30 seconds
    (lib/live-auctions-client.ts), and a 30-second browser cache on top would
    let that poll re-read its own previous answer.
  */
  return Response.json(
    { lots, listed },
    { headers: { "Cache-Control": "no-store" } },
  );
}
