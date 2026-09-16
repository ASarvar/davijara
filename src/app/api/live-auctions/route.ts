import { getLiveAuctionLots } from "@/lib/data/live-auctions";

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
  The route's own cache, matching the upstream fetch's. Without it a route
  handler that takes no request parameters can be prerendered once and serve
  a list of rooms that closed hours ago.
*/
export const revalidate = 30;

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

  return Response.json(
    { lots },
    { headers: { "Cache-Control": "public, max-age=30" } },
  );
}
