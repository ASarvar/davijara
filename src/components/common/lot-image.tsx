"use client";

import { useEffect, useRef, useState } from "react";

import { ImagePlaceholder } from "@/components/common/placeholder/image-placeholder";
import { withBasePath } from "@/lib/base-path";

/*
  A lot's photograph, fetched on demand.

  WHY NOT SERVER-RENDERED WITH THE REST OF THE CARD

  The listings endpoint returns no image reference, so each photo costs one
  extra request to the order service (see lib/data/lot-images.ts). The map
  carries ~1,150 pins and the catalogue paginates over the same set, so
  resolving every image up front would mean ~1,150 internal requests to paint
  one page. Fetching per lot, only when that lot is actually on screen, keeps
  it to the handful a reader looks at.

  WHAT IT DOES WHEN THERE IS NO PHOTO

  Falls back to the branded placeholder — the same one that was there before
  any of this existed. That covers a lot with no photographs, a sample record,
  an unreachable service, and a slow one. CLAUDE.md's rule still holds: a photo
  appears only when upstream supplies one for THIS lot, and stock imagery is
  never substituted, because a photo on a state lot card reads as a photo OF
  that lot.

  ── EVERY FAILURE HERE USED TO BE PERMANENT ────────────────────────────────
  And that is what put placeholders on cards whose photographs exist. Measured
  in headless Chrome against the real services, throttled to a slow link: of
  15 photo loads on the homepage carousel, 3 came back
  `net::ERR_ABORTED, canceled=true`. The browser cancelling an image it has
  decided not to finish is ORDINARY — it does it when an element moves, when
  the connection is contended, when a lazy candidate falls back out of range.
  It is not an error about the photograph.

  The old code treated it as final: `onError` latched a `failed` flag with no
  retry, and the observer had already disconnected itself, so nothing would
  ever ask again for the life of the page. One cancelled request, and that lot
  showed the placeholder until a reload — on a card whose photo the service
  serves in 50ms. Both paths now retry, and only a genuinely absent photo ends
  in the placeholder.
*/
/*
  One request per lot per page, however many cards ask for it.

  The recently-sold carousel renders its children TWICE — the second copy is
  what makes the wrap seamless — so without this every photograph in that row
  was fetched twice, both in flight at once, while the row was trying to
  animate. The map and the catalogue can also show the same lot in two places.

  Keyed on the pair, because the region decides which account the server
  authenticates with; the same order id under a different region is a different
  request. The entry is the PROMISE, so callers that arrive while one is in
  flight join it rather than starting another, and it is dropped on failure so
  a transient error does not stick for the life of the page.

  Deliberately not an LRU or a TTL: this lives for one page view, and the
  server already owns freshness — see the route's `max-age` and the
  `unstable_cache` behind it.
*/
const inFlight = new Map<string, Promise<string | null>>();

/**
 * Thrown for a fault that asking again cannot fix.
 *
 * Retrying is the DEFAULT here, and the exception is named rather than the
 * rule: a dropped connection, a 503 from the route's upstream guard and a
 * gateway hiccup are all worth another go, and listing them exhaustively is
 * how one gets missed. Only our own route rejecting the arguments — a
 * malformed order id, a region slug that is not one of the fourteen — is
 * settled, because the second request would carry the same arguments.
 */
class Permanent extends Error {}

function lookup(orderId: string, region: string): Promise<string | null> {
  const key = `${orderId}|${region}`;
  const existing = inFlight.get(key);
  if (existing) return existing;

  const request = fetch(
    withBasePath(
      `/api/lot-image?order=${encodeURIComponent(orderId)}&region=${encodeURIComponent(region)}`,
    ),
  )
    .then(async (res) => {
      if (!res.ok) {
        const message = `HTTP ${res.status}`;
        throw res.status >= 400 && res.status < 500
          ? new Permanent(message)
          : new Error(message);
      }
      const json = (await res.json()) as { image?: string | null };
      return json.image ?? null;
    })
    .catch((error: unknown) => {
      inFlight.delete(key);
      throw error;
    });

  inFlight.set(key, request);
  return request;
}

/*
  The service hands back the largest rendition and only that one.

  `…_L.jpg` is 900×1200 and ~310KB; the card paints it into a box 363px wide
  and 204px tall, cropped by `object-cover`. Twelve of those is 3.7MB of
  photography to fill about a megapixel of screen — which is what made the
  browser start abandoning them on a slow link in the first place.

  The other renditions are not documented, they are OBSERVED: `_T` (75×100),
  `_S` (300×400) and `_M` (600×800) sit beside every `_L` on the same host.
  Checked over 794 distinct image URLs pulled from all fourteen regions —
  every one ends in `_L.<ext>`, and `_M` and `_S` answered 200 for all 51
  sampled across `.jpg`, `.jpeg` and `.png`.

  Still written as a guard rather than an assumption: a URL that does not end
  in `_L.<ext>` is used exactly as it came, with no srcset at all. If the
  naming ever changes, the photograph keeps working at full size instead of
  the card 404ing its way to a placeholder.
*/
const LARGE_SUFFIX = /_L(\.[a-z]+)$/i;

function srcSetFor(url: string): string | undefined {
  if (!LARGE_SUFFIX.test(url)) return undefined;
  return [
    `${url.replace(LARGE_SUFFIX, "_S$1")} 300w`,
    `${url.replace(LARGE_SUFFIX, "_M$1")} 600w`,
    `${url} 900w`,
  ].join(", ");
}

/**
 * The nearest ancestor that scrolls horizontally, or null.
 *
 * This is how a card tells "I am in the carousel" from "I am in the grid"
 * without either of them passing a prop down through `SoldLotCard`.
 */
function horizontalScrollParent(node: HTMLElement): HTMLElement | null {
  for (let el = node.parentElement; el; el = el.parentElement) {
    const overflow = getComputedStyle(el).overflowX;
    if (overflow === "auto" || overflow === "scroll") return el;
  }
  return null;
}

/** Attempts at the lookup before a lot is treated as having no photo. */
const LOOKUP_TRIES = 3;

/**
 * Attempts at painting the photo itself after the browser abandons one.
 *
 * Attempt 0 offers the full `srcSet`; every attempt after it uses the bare
 * `src` the service actually gave us — see the note on `srcSetFor`. So the
 * three attempts are not three identical requests: they are "the rendition
 * the browser prefers", then twice "the one we know exists".
 */
const IMAGE_TRIES = 3;

/**
 * Backoff between attempts, in ms.
 *
 * Spread past the two seconds a contended page-load takes to clear, because
 * that congestion is what makes the browser abandon an image in the first
 * place — three attempts inside one second would all land in the same jam
 * and retry nothing that was not already going to fail.
 */
const BACKOFF_MS = [600, 2400];

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function LotImage({
  photo,
  orderId,
  region,
  eager = false,
  zoom = "slow",
  sizes = "(max-width: 640px) 90vw, 380px",
  className,
}: {
  /**
   * A photo URL the caller already has, skipping the lookup entirely.
   *
   * For the day the listings endpoint starts carrying `image` on the lot
   * itself. It exists so that case goes through THIS component rather than a
   * second `<img>` beside it: `lot-card.tsx` had one, and being a separate
   * element it quietly kept every behaviour this file exists to fix — the
   * `loading="lazy"` that makes the browser abandon loads, no retry, and no
   * placeholder to fall back to when a photo fails to decode.
   */
  photo?: string;
  /**
   * The lot's `order_id` — NOT its lot number and NOT `Listing.id`, which
   * falls back to the lot number when upstream omits the order id. The order
   * endpoint keys on this field alone, so a lot without one simply shows the
   * placeholder rather than sending a request that cannot match.
   */
  orderId?: string;
  /**
   * The lot's region slug. Required, because each territorial office has its
   * own account on the order service and a lot must be requested with its own
   * region's credentials — the wrong account returns nothing rather than an
   * error. The listings endpoint does not carry the owning office, so this is
   * how the server learns which account to use.
   */
  region?: string;
  /**
   * Skip the visibility check and fetch immediately. For the map popup, which
   * only exists once the reader has opened it — waiting for an intersection
   * callback there just delays a photo that was already asked for.
   */
  eager?: boolean;
  /**
   * How long the hover zoom takes. `fast` matches the 350ms lift on the sold
   * card; at the default 600ms the photograph was still easing after the card
   * had settled, which reads as two hovers rather than one.
   *
   * A prop rather than a class from the caller, because the transform belongs
   * to the `<img>`. Applying one to the wrapper as well — which is how this
   * was written first — compounds the two into a 1.1025 zoom.
   */
  zoom?: "slow" | "fast";
  /**
   * What the box is actually going to be, for picking a rendition.
   *
   * The default describes the card grids — one column of about 90vw on a
   * phone, three 380px columns above `sm`. It has to be honest: the first
   * version said `100vw` below 640px, and on a 375px phone at DPR 2 that made
   * the browser compute 750px and reach for the 900w `_L` on a card 272px
   * wide, undoing the point of offering the smaller renditions on exactly the
   * slow connections they exist for.
   */
  sizes?: string;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  /** Set once the photograph has actually painted — see the render. */
  const [loaded, setLoaded] = useState(false);
  /** Bumped to remount the `<img>`, which is what re-issues the request. */
  const [attempt, setAttempt] = useState(0);
  const boxRef = useRef<HTMLDivElement>(null);
  const retryTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  /*
    THE PHOTO IS KEYED TO THE LOT, so a reused instance cannot show the wrong
    one.

    React reuses a component instance when the same element type sits at the
    same position with the same key — which is what pagination, a filter
    re-query and the carousel's own rotation all do. Only the effect below was
    keyed to `[orderId, region]`; `src` was not, so an instance that changed
    lots kept painting the PREVIOUS lot's photograph until the new lookup
    resolved, and kept it for good if the new lot turned out to have none. On
    a state portal a photo on a card reads as a photo OF that lot, so that is
    not a cosmetic race.

    Written as render-phase state adjustment rather than an effect: it takes
    hold in the same commit, so the stale photo is never painted even once.
  */
  const [shownFor, setShownFor] = useState<string | undefined>(undefined);
  const key = photo ?? (orderId && region ? `${orderId}|${region}` : undefined);
  if (shownFor !== key) {
    setShownFor(key);
    setSrc(photo ?? null);
    setFailed(false);
    setLoaded(false);
    setAttempt(0);
  }

  useEffect(() => {
    // Nothing to look up: the caller handed us the photograph.
    if (photo) return;
    // Both are required: without the region the server has no account to
    // authenticate with, so the request could only ever come back empty.
    if (!orderId || !region) return;

    /*
      A flag, not an `AbortController`. The request is shared with every other
      card asking for the same lot (see `lookup`), so aborting it here would
      cancel it for them too. Unmounting stops us USING the answer; it does not
      get to take it away from anyone else.
    */
    let cancelled = false;

    /*
      Retried, because the answer to "did that fail?" is almost always "not
      for a reason about this lot". `lookup` drops a failed promise from the
      shared map, so a second call really does go back to the server; before
      this, the one card that lost a request during a blip kept its
      placeholder until the reader reloaded the page.

      This only spins for FAULTS — a 503, a dropped connection. A lot with no
      photographs resolves to `null` on the first try and stops there, because
      the server distinguishes the two now and says which it is. It did not
      always: every upstream failure used to arrive as a cacheable 200 with
      `{"image":null}`, indistinguishable from "this lot has no picture", so a
      loop written exactly like this one retried nothing at all.
    */
    const load = async () => {
      for (let tries = 0; tries < LOOKUP_TRIES; tries++) {
        try {
          const image = await lookup(orderId, region);
          if (!cancelled && image) setSrc(image);
          return;
        } catch (error) {
          // Bad arguments — the next request would carry the same ones.
          if (error instanceof Permanent) return;
          const backoff = BACKOFF_MS[tries];
          if (cancelled || backoff === undefined) return;
          await wait(backoff);
          // Checked AGAIN: the card may have gone while we were waiting, and
          // firing a request for a card that no longer exists helps nobody.
          if (cancelled) return;
        }
      }
    };

    if (eager) {
      void load();
      return () => {
        cancelled = true;
      };
    }

    const node = boxRef.current;
    if (!node) return;

    /*
      IntersectionObserver rather than a plain effect, so a catalogue page of
      cards does not fire a request per card the moment it renders.

      ── WHY THE CAROUSEL NEEDS A SECOND ONE ──────────────────────────────
      `rootMargin` expands the ROOT. With the viewport as root that buys the
      grid 300px of warning before a card is reached — but a card in the
      carousel is clipped by the track's `overflow-x`, and no margin on the
      viewport can see past that clip. A drifting card therefore went from
      "invisible" to "fully on screen" with zero lead time, and only started
      fetching once the reader was already looking at it. That is the pop-in
      behind "some cards have no photo": they were all still loading.

      So when the card sits in a horizontal scroller, both have to be true:

        near     — the TRACK is within 300px of the viewport (the reader has
                   scrolled the section into reach at all), and
        approach — the CARD is within 400px of the track's visible strip,
                   measured against the track itself, which is the only root
                   that can see horizontally inside it.

      Two observers rather than one, because a single element-rooted observer
      would report every card in the track as intersecting while the whole
      section was still far below the fold, and fetch twelve photographs for a
      section nobody has reached.
    */
    const scroller = horizontalScrollParent(node);

    let near = scroller === null;
    let approach = false;
    const observers: IntersectionObserver[] = [];

    const settle = () => {
      if (!near || !approach) return;
      for (const observer of observers) observer.disconnect();
      void load();
    };

    observers.push(
      new IntersectionObserver(
        (entries) => {
          approach = entries.some((e) => e.isIntersecting);
          settle();
        },
        scroller
          ? { root: scroller, rootMargin: "0px 400px" }
          : { rootMargin: "300px" },
      ),
    );
    observers[0].observe(node);

    if (scroller) {
      observers.push(
        new IntersectionObserver(
          (entries) => {
            near = entries.some((e) => e.isIntersecting);
            settle();
          },
          { rootMargin: "300px" },
        ),
      );
      observers[1].observe(scroller);
    }

    return () => {
      cancelled = true;
      for (const observer of observers) observer.disconnect();
    };
  }, [photo, orderId, region, eager]);

  /*
    The retry timer belongs to the component, not to the callback that set it.

    An uncleared `setTimeout` fires into a dead instance and, worse, holds its
    closure — and through it the photo URL — alive until it does. Twenty-four
    carousel cards navigating away at once is twenty-four of them.
  */
  useEffect(
    () => () => {
      if (retryTimer.current) clearTimeout(retryTimer.current);
    },
    [],
  );

  /*
    One string, used by both layers. It was written out twice — once for the
    photo and once for the placeholder — and the two had already drifted apart
    once, which is the bug that put a second `scale-1.05` on the sold card's
    wrapper and zoomed it by 1.1025 on hover.

    `opacity` rides along with `transform` so the photograph fades in over the
    placeholder rather than replacing it in one frame.
  */
  const zoomClass = `transition-[transform,opacity] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.05] ${
    zoom === "fast" ? "duration-[350ms]" : "duration-[600ms]"
  }`;

  /*
    THE PLACEHOLDER IS THE FLOOR, not the alternative.

    It used to be one arm of a ternary, so the moment a photo URL arrived the
    placeholder left the DOM — and if that photo then failed, the card was
    simply EMPTY for as long as the retries ran, with the `×N` rise badge
    floating on bare card surface. Now the placeholder is always painted and
    the photograph sits on top of it, revealed only once it has actually
    decoded. Every intermediate state — waiting, loading, retrying, failed —
    shows the branded box, which is what the card should look like when there
    is no picture on screen.
  */
  const showPhoto = src !== null && !failed;

  return (
    <div ref={boxRef} className={`relative ${className ?? ""}`}>
      <ImagePlaceholder className={zoomClass} />

      {showPhoto ? (
        /*
          Plain <img>, not next/image: these are remote files on a host we do
          not control, and optimising them would proxy every one through our
          own server for no gain.

          NO `loading="lazy"`. We have already done the lazying — the src is
          only ever set for a lot the reader has reached — and asking the
          browser to defer it a second time is what made it abandon loads
          inside the drifting carousel. The two gates disagreed: ours said
          "this card is here now", Chrome's said "this element is moving,
          I'll get it later", and later never came.

          `key={attempt}` is what makes the retry real. Re-assigning the same
          `src` to a live element is a no-op; replacing the element issues a
          fresh request.

          `opacity` rather than mounting on load, so the browser has an
          element to decode into. If `onLoad` never fires the photo stays
          transparent over the placeholder — which is the correct picture of
          "no photograph on screen", not a stranded blank.
        */
        // eslint-disable-next-line @next/next/no-img-element -- remote lot photo on a host we do not control; see above.
        <img
          key={attempt}
          src={src}
          /*
            Only the first attempt gets to choose a rendition. `_S` and `_M`
            are derived from a naming convention, and while it held for every
            one of the 794 URLs checked, a single lot missing its `_M` would
            otherwise fail, remount with the same srcSet, re-select the same
            missing file and end at the placeholder — on a card that used to
            show its photograph. Falling back to the bare `src` retries with
            the one rendition the service actually named.
          */
          srcSet={attempt === 0 ? srcSetFor(src) : undefined}
          sizes={attempt === 0 ? sizes : undefined}
          alt=""
          decoding="async"
          onLoad={() => setLoaded(true)}
          onError={() => {
            /*
              A cancelled load is not a missing photograph. Give it back a
              couple of times before conceding the placeholder — by the third
              failure it really is a URL that will not paint.
            */
            const next = attempt + 1;
            if (next < IMAGE_TRIES) {
              retryTimer.current = setTimeout(
                () => setAttempt(next),
                BACKOFF_MS[attempt] ?? 600,
              );
            } else {
              setFailed(true);
            }
          }}
          className={`absolute inset-0 h-full w-full object-cover ${zoomClass} ${
            loaded ? "opacity-100" : "opacity-0"
          }`}
        />
      ) : null}
    </div>
  );
}
