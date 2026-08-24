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
/*
  An INN is 9 digits. Anything else in this variable is a configuration
  mistake, and the one that actually happened is worth naming: systemd's
  `EnvironmentFile=` does NOT strip a trailing `#` comment, so

      ORDER_API_INN_1727=300393445   # Toshkent viloyati

  sets the username to the whole string after the `=`. The service answers
  `result_code 25: Foydalanuvchi aniqlanmadi`, which reads as a wrong password
  rather than as a malformed file — and it works locally the whole time,
  because `dotenv` (which the build step uses) DOES strip those comments.

  Checking the shape turns that into one obvious log line instead of an
  afternoon. Deliberately a format check, not a strip: silently trimming
  whatever follows would hide the same mistake in any other variable.
*/
const INN_PATTERN = /^\d{9}$/;

function credentialsFor(apiId: number): { user: string; pass: string } | null {
  const raw = process.env[`ORDER_API_INN_${apiId}`];
  const inn = raw?.trim();

  if (inn && !INN_PATTERN.test(inn)) {
    console.warn(
      `[lot-images] ORDER_API_INN_${apiId} is not a 9-digit INN — check for a ` +
        `trailing "#" comment on that line, which systemd folds into the value.`,
    );
    return null;
  }

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

/**
 * A fault, as opposed to an answer.
 *
 * "This lot has no photograph" and "we could not find out" were the same value
 * — `null` — and that single conflation is what pinned placeholders onto cards
 * whose photographs exist. `null` was returned for a timeout, a rejected
 * account and a malformed body alike, `unstable_cache` stored it like any other
 * result, the route served it as a 200, and every layer above treated a
 * momentary failure as the settled fact that this lot has no picture.
 *
 * So a fault throws instead. `unstable_cache` does not store a rejection, the
 * route turns it into a 503 that no cache keeps, and the browser retries. A
 * lot that genuinely has no photographs still returns `null`, which is a real
 * answer and is cached as one.
 */
export class LotImageUnavailable extends Error {
  constructor(reason: string) {
    super(reason);
    this.name = "LotImageUnavailable";
  }
}

async function fetchLotImage(
  orderId: string,
  apiId: number,
): Promise<string | null> {
  /*
    Not faults, and deliberately not thrown: an unconfigured service and a
    region with no account are settled states, not blips. Retrying them would
    spend three requests to be told the same thing, so they answer `null` —
    "no photograph to show" — and are cached like any other answer.
  */
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
      throw new LotImageUnavailable(`HTTP ${res.status}`);
    }

    const json = (await res.json()) as OrderApiResponse;

    /*
      200 with a non-zero `result_code` is this service's failure shape — the
      listings endpoint behaves the same way with `success: false`. But not
      every non-zero code is a FAULT, and the difference decides whether the
      browser is told to ask again.

      Probed directly against the service:

        0   Muvaffaqiyatli                            the order, with images
        25  Foydalanuvchi aniqlanmadi                 the ACCOUNT was rejected
        27  Foydalanuvchinig buyurtmasi aniqlanmadi   no such order here

      27 came back for a made-up order id (1, 999999999) and — the case that
      matters — for a REAL Qoraqalpog'iston order requested under Farg'ona's
      account. So it is the service answering "not one of mine", which is a
      settled fact about this pair and is cached like any other answer.
      Throwing on it would have put three retries and a 503 behind every
      crawler probing `?order=1`.

      25 is a fault: the credentials for this region are wrong. Retrying will
      not fix it, but it must not be cached as "this lot has no photograph"
      either — that would hide a configuration error behind a plausible-looking
      placeholder for an hour, and would keep doing so after it was corrected.
    */
    const NO_SUCH_ORDER = 27;
    if (json.result_code === NO_SUCH_ORDER) return null;

    if (json.result_code !== 0) {
      warn(
        apiId,
        orderId,
        `result_code ${json.result_code}: ${json.result_msg}`,
      );
      throw new LotImageUnavailable(`result_code ${json.result_code}`);
    }

    const images = json.orders?.[0]?.images;

    /*
      A lot with no photographs is NOT a failure and is not logged.

      Roughly a fifth of live lots have none — the placeholder is the correct,
      expected answer for them. Logging that would put a line in the journal
      every time anyone scrolled past one, on a catalogue of ~1,150 lots, and
      bury the lines that mean something. Only genuine faults are logged:
      transport errors, a rejected account, or a response carrying images we
      cannot use.
    */
    if (!json.orders?.length) {
      warn(apiId, orderId, "no order in response");
      throw new LotImageUnavailable("no order in response");
    }

    /*
      From here down every outcome is an ANSWER. The service was reached, it
      recognised the account and it described the order — so "no usable
      photograph" is a fact about this lot and is cached as one, rather than
      something worth asking again.
    */
    const picked = pickMainImage(images);
    if (!picked && images?.length) {
      warn(apiId, orderId, `${images.length} image(s), none usable`);
    }
    return picked;
  } catch (error) {
    if (error instanceof LotImageUnavailable) throw error;
    // Network unreachable, timeout, malformed JSON — we never got an answer,
    // so we must not manufacture one.
    warn(apiId, orderId, error instanceof Error ? error.name : "unknown error");
    throw new LotImageUnavailable(
      error instanceof Error ? error.name : "unknown error",
    );
  }
}

/**
 * The lot's primary photograph, or null when it has none.
 *
 * Throws `LotImageUnavailable` when the service could not answer. The caller
 * must let that through as a failure rather than turning it into "no photo" —
 * see the route handler. `unstable_cache` never stores a rejection, so a
 * fault is never what gets cached here — only an ANSWER is, whether that
 * answer is a photo or a confirmed "this lot has none". That is the literal
 * shape of "cache it only once it has arrived successfully".
 *
 * `apiId` is the lot's region — its account is what the service authenticates
 * against, so it is part of the identity of the request, not a detail. It is
 * also part of the cache key by virtue of being an argument, which is what
 * keeps a miss under one region's account from being served for another's.
 *
 * A DAY, now that only answers get here.
 *
 * It used to be an hour, and before that five minutes — both numbers were
 * never about freshness, they were the ceiling a SWALLOWED failure imposed.
 * `unstable_cache` stores whatever the function RETURNS, and when a timeout
 * still returned `null`, that `null` was indistinguishable from a lot with no
 * pictures, so the lifetime had to be short enough to bound a blip. Measured
 * at the time: a 21-second network blip produced 18 timeouts, and every one
 * of those lots then served `{"image":null}` in ~12ms without re-contacting
 * the service, while the API answered 4-8 photographs for the same orders in
 * ~50ms.
 *
 * A fault now throws instead of returning `null`, and a throw is never
 * cached — so a blip is no longer persisted at all, and the lifetime can
 * follow the DATA rather than the failure mode. A published lot's
 * photographs do not change, so a day is not even generous; it is bounded
 * only by the possibility that an office edits a listing shortly after
 * publishing it, which is a same-day event if it happens at all.
 */
export const getLotImage = unstable_cache(fetchLotImage, ["lot-image"], {
  revalidate: 86_400,
  tags: ["lot-images"],
});
