import { regions } from "@/content/regions";
import { getLotImage, LotImageUnavailable } from "@/lib/data/lot-images";

/*
  One lot's photograph, for the browser.

  This exists because the order endpoint is unreachable from a browser and must
  stay that way: it lives on an internal address (10.190.4.122) and takes a
  username and password in its request body. Fetching it from the client would
  publish those credentials to every visitor. So the client asks us, and only
  the server ever talks to the service.

  Not locale-prefixed: `src/proxy.ts` excludes `api` from its matcher, so
  next-intl never rewrites this path. Under `basePath` it is served at
  `/site/api/lot-image`, which is why callers build the URL with
  `withBasePath()` rather than hardcoding a leading slash.
*/
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const order = params.get("order");
  const regionSlug = params.get("region");

  /*
    Digits only, and bounded.

    `order` arrives from the browser and is used to key a server-side cache
    entry and to build an upstream request body. Without this, an attacker
    could mint unbounded distinct cache keys, and anything non-numeric would be
    forwarded to an internal service that never expects it. The upstream field
    is a numeric id, so anything else is malformed by definition.
  */
  if (!order || !/^\d{1,18}$/.test(order)) {
    return Response.json({ image: null }, { status: 400 });
  }

  /*
    The region selects which territorial office's account the upstream call is
    made with — see lib/data/lot-images.ts. It has to come from the caller
    because the listings endpoint does not return a lot's `customer_inn`, so
    the server cannot derive the owning office from the order id alone.

    Resolved against the region TABLE rather than trusted: only the fourteen
    known slugs map to anything, so the caller can pick among real regions and
    nothing else. That bounds both the cache keyspace and the set of accounts
    a request can reach.
  */
  const region = regions.find((r) => r.slug === regionSlug);
  if (!region) {
    return Response.json({ image: null }, { status: 400 });
  }

  /*
    A fault is reported AS a fault, and this is the whole point of the split.

    This used to answer 200 with `{"image":null}` whatever had gone wrong, and
    cache it — so a timeout, a rejected account and a lot that simply has no
    photographs were one indistinguishable response. The browser had no way to
    tell "there is nothing to show you" from "ask me again", so it never asked
    again, and one blip left a placeholder on a card whose photograph the
    service serves in 50ms.

    503 with `no-store`: nothing between here and the reader keeps it, and
    `LotImage` retries. `image: null` still rides along so a client that
    ignores the status renders the placeholder rather than breaking.
  */
  let image: string | null;
  try {
    image = await getLotImage(order, region.apiId);
  } catch (error) {
    /*
      TWO KINDS OF 503, and the difference is what keeps the site navigable
      while the order service is down.

      An ordinary fault means "we tried and it did not work" — worth another
      go, and `LotImage` retries. But when the breaker in lib/data/lot-images
      is open, every retry is guaranteed to fail the same way, and the site is
      served over HTTP/1.1: six connections per origin, a card holding one for
      ~33 seconds across its three attempts, twelve cards per page. Those
      retries do not just waste time, they queue the reader's next PAGE behind
      them.

      So `retry: false` tells the client to take the placeholder and stop.
      `Retry-After` says the same thing to anything else in the chain. Still
      `no-store`, because none of this is an answer about the lot.
    */
    const paused = error instanceof LotImageUnavailable && error.serviceDown;

    return Response.json(
      paused ? { image: null, retry: false } : { image: null },
      {
        status: 503,
        headers: paused
          ? { "Cache-Control": "no-store", "Retry-After": "30" }
          : { "Cache-Control": "no-store" },
      },
    );
  }

  return Response.json(
    { image },
    {
      headers: {
        /*
          A DAY at the edge, matching `getLotImage`'s own lifetime — a reader
          panning the map reopens the same popups repeatedly, and a published
          lot's photograph does not change hour to hour, or usually day to
          day. `stale-while-revalidate` adds a further week: past the first
          day a cached response keeps being served immediately while a fresh
          one is fetched in the background, so a returning reader never waits
          on a revalidation even after the day has passed.

          `null` gets the SAME lifetime as a photograph. It used to be cut
          short because it doubled as the failure response; a `null` that
          reaches this line means the service answered and this lot has no
          usable picture, which is as durable a fact as the picture itself —
          see `getLotImage`'s doc comment for why only answers, never faults,
          get this far.
        */
        "Cache-Control": "public, max-age=86400, stale-while-revalidate=604800",
      },
    },
  );
}
