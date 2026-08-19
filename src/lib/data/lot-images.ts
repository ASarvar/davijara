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

async function fetchLotImage(orderId: string): Promise<string | null> {
  const base = process.env.ORDER_API_URL;
  if (!base) return null;

  /*
    Falls back to the listings credentials, because the two endpoints live on
    the same service and are likely to share an account — but stays
    overridable, because that is an assumption and the sample request carries
    a different-looking value. If they turn out to differ, set ORDER_API_USER
    / ORDER_API_PASSWORD and nothing else has to change.
  */
  const username = process.env.ORDER_API_USER ?? process.env.API_USER;
  const password = process.env.ORDER_API_PASSWORD ?? process.env.API_PASSWORD;
  if (!username || !password) return null;

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
      // Shorter than the listings fetch: this one blocks a single image, and
      // a slow response should degrade to the placeholder, not hold a card.
      signal: AbortSignal.timeout(8_000),
    });
    if (!res.ok) return null;

    const json = (await res.json()) as OrderApiResponse;
    // 200 with a non-zero result_code is this service's failure shape — the
    // listings endpoint behaves the same way with `success: false`.
    if (json.result_code !== 0) return null;

    return pickMainImage(json.orders?.[0]?.images);
  } catch {
    // Network unreachable, timeout, malformed JSON — all the same to a caller
    // that just wants "a photo, or the placeholder".
    return null;
  }
}

/**
 * The lot's primary photograph, or null.
 *
 * Cached for a day: a published lot's photographs do not change, and the map
 * re-requests the same handful of orders as a reader pans around.
 */
export const getLotImage = unstable_cache(fetchLotImage, ["lot-image"], {
  revalidate: 86_400,
  tags: ["lot-images"],
});
