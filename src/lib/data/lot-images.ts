import { unstable_cache } from "next/cache";

/*
  Per-lot photographs, from the auction service's order endpoint.

  WHY THIS IS A SEPARATE CALL, AND LAZY

  The listings endpoint (`auction/list`, see listings.ts) returns no image
  reference at all. e-auksion does hold photographs, but their URLs are
  `https://media.e-auksion.uz/i/<hash>_L.jpg` where `<hash>` is an opaque
  content digest with no relation to the lot number — so a URL cannot be
  derived and the reference has to come as data.

  This endpoint supplies it, but ONE ORDER AT A TIME. The map carries ~1,150
  pins, so prefetching every image would be ~1,150 requests to an internal
  service to render one page. Images are therefore fetched only for lots a
  reader actually looks at — see components/common/lot-image.tsx and the route
  handler at app/api/lot-image.

  UNTESTED AGAINST THE LIVE SERVICE. 10.190.4.122 is on an internal network
  with no route from this development machine, so every line below is written
  against the sample response and nothing here has been exercised end to end.
  It is built to fail silently: any error, any unexpected shape, any missing
  field returns null and the caller falls back to the branded placeholder.
*/

/** One entry of `orders[].images[]`. */
interface OrderApiImage {
  image?: string;
  /** 1 on the lot's primary photo. Exactly one entry carries it. */
  is_main?: number;
  image_position?: string;
}

interface OrderApiResponse {
  /** 0 on success. The HTTP status is 200 either way. */
  result_code?: number;
  result_msg?: string;
  orders?: { order_id?: number; images?: OrderApiImage[] }[];
}

/*
  The only host these images may come from.

  Belt to the CSP's braces: `img-src` in next.config.ts already allows exactly
  this origin, so a URL pointing anywhere else would be blocked by the browser
  and render as a broken image. Rejecting it here turns that into the
  placeholder instead — and keeps a compromised or misconfigured upstream from
  using our pages to issue requests to a host of its choosing.
*/
const ALLOWED_IMAGE_HOST = "media.e-auksion.uz";

function pickMainImage(images: OrderApiImage[] | undefined): string | null {
  if (!Array.isArray(images) || images.length === 0) return null;

  /*
    `is_main` first, array order second.

    These are not the same thing: in the sample response the flagged image is
    the FIFTH entry, so taking `images[0]` would show a different photo from
    the one e-auksion itself leads with. Array order is only the fallback for
    a lot where nothing is flagged.
  */
  const main = images.find((i) => i.is_main === 1) ?? images[0];
  const url = main?.image;
  if (typeof url !== "string" || url.length === 0) return null;

  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return null;
    if (parsed.hostname !== ALLOWED_IMAGE_HOST) return null;
    return parsed.toString();
  } catch {
    // Not a parseable absolute URL — treat as absent rather than emitting it.
    return null;
  }
}

/*
  Credentials are PER REGION, not per service.

  Each of the fourteen territorial offices has its own account, and the
  username and password are both that office's INN — confirmed against a live
  response, where `customer_inn` and the working credentials were the same
  value. A lot therefore has to be requested with ITS OWN region's account;
  the wrong one does not error loudly, it just comes back with nothing, which
  is why every region but the configured one silently showed placeholders.

  Read as `ORDER_API_INN_<apiId>`, keyed by the SOATO id already in
  content/regions.ts — so a region is configured by pasting one line, and the
  key is greppable against the region table rather than being a private
  ordering of its own.

  `ORDER_API_USER` / `ORDER_API_PASSWORD` stay as a fallback for a region with
  no entry, which keeps a partially-configured deployment working for whatever
  is filled in instead of failing everywhere.
*/
function credentialsFor(apiId: number): { user: string; pass: string } | null {
  const inn = process.env[`ORDER_API_INN_${apiId}`];
  if (inn) return { user: inn, pass: inn };

  const user = process.env.ORDER_API_USER ?? process.env.API_USER;
  const pass = process.env.ORDER_API_PASSWORD ?? process.env.API_PASSWORD;
  return user && pass ? { user, pass } : null;
}

/*
  One line per failed lookup, and it exists because this feature fails
  INVISIBLY by design: every failure path ends in the same placeholder a
  photo-less lot shows, so "no images on the server" and "these lots have no
  photos" look identical from outside. Without this the only way to tell them
  apart is to reproduce the call by hand.

  Never logs the credentials, only which region's account was used.
*/
function warn(apiId: number, orderId: string, reason: string): void {
  console.warn(
    `[lot-images] region ${apiId}, order ${orderId}: ${reason}` +
      (process.env[`ORDER_API_INN_${apiId}`]
        ? ""
        : " (no ORDER_API_INN_" + apiId + " — used the fallback account)"),
  );
}

async function fetchLotImage(
  orderId: string,
  apiId: number,
): Promise<string | null> {
  const base = process.env.ORDER_API_URL;
  if (!base) return null;

  const credentials = credentialsFor(apiId);
  if (!credentials) return null;
  const { user: username, pass: password } = credentials;

  try {
    const res = await fetch(base, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        order: Number(orderId),
        username,
        password,
        language: "uz",
      }),
      /*
        Shorter than the listings fetch: this one blocks a single image, and a
        slow response should degrade to the placeholder rather than hold a
        card open.

        10s rather than the 8s first written here, because the service is
        reached through a proxy hop that was measured taking >10s just to
        FAIL from outside its network — so a real response on a cold cache is
        plausibly several seconds, and a timeout tighter than the service is
        slow would show placeholders for photographs that do exist.
      */
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) {
      warn(apiId, orderId, `HTTP ${res.status}`);
      return null;
    }

    const json = (await res.json()) as OrderApiResponse;
    // 200 with a non-zero result_code is this service's failure shape — the
    // listings endpoint behaves the same way with `success: false`.
    if (json.result_code !== 0) {
      warn(apiId, orderId, `result_code ${json.result_code}: ${json.result_msg}`);
      return null;
    }

    const images = json.orders?.[0]?.images;
    const picked = pickMainImage(images);
    if (!picked) {
      warn(
        apiId,
        orderId,
        json.orders?.length
          ? `${images?.length ?? 0} image(s), none usable`
          : "no order in response",
      );
    }
    return picked;
  } catch (error) {
    // Network unreachable, timeout, malformed JSON — all the same to a caller
    // that just wants "a photo, or the placeholder".
    warn(apiId, orderId, error instanceof Error ? error.name : "unknown error");
    return null;
  }
}

/**
 * The lot's primary photograph, or null.
 *
 * `apiId` is the lot's region — its account is what the service authenticates
 * against, so it is part of the identity of the request, not a detail. It is
 * also part of the cache key by virtue of being an argument, which is what
 * keeps a miss under one region's account from being served for another's.
 *
 * AN HOUR, NOT A DAY, and the reason is failures rather than freshness.
 * A published lot's photographs never change, so a day would be right for a
 * hit — but `unstable_cache` stores whatever the function returns, and a
 * `null` from a missing credential or an unreachable service is a return
 * value like any other. At 24h one bad lookup pinned the placeholder for a
 * full day: after the credentials were corrected the route still answered
 * `{"image":null}` in ~12ms, never re-contacting the service, which reads
 * exactly like the fix not having worked. An hour bounds that.
 *
 * A config change should not be waited out. Restarting the service drops the
 * cache, and a deploy does it anyway — deploy.sh builds each release its own
 * `.next/cache`.
 */
export const getLotImage = unstable_cache(fetchLotImage, ["lot-image"], {
  revalidate: 3_600,
  tags: ["lot-images"],
});
