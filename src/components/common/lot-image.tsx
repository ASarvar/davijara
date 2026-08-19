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
*/
export function LotImage({
  orderId,
  eager = false,
  className,
}: {
  /**
   * The lot's `order_id` — NOT its lot number and NOT `Listing.id`, which
   * falls back to the lot number when upstream omits the order id. The order
   * endpoint keys on this field alone, so a lot without one simply shows the
   * placeholder rather than sending a request that cannot match.
   */
  orderId?: string;
  /**
   * Skip the visibility check and fetch immediately. For the map popup, which
   * only exists once the reader has opened it — waiting for an intersection
   * callback there just delays a photo that was already asked for.
   */
  eager?: boolean;
  className?: string;
}) {
  const [src, setSrc] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!orderId) return;

    let cancelled = false;
    const controller = new AbortController();

    const load = async () => {
      try {
        const res = await fetch(
          withBasePath(`/api/lot-image?order=${encodeURIComponent(orderId)}`),
          { signal: controller.signal },
        );
        if (!res.ok) throw new Error(String(res.status));
        const json = (await res.json()) as { image?: string | null };
        if (!cancelled && json.image) setSrc(json.image);
      } catch {
        // Aborted, offline, upstream down — the placeholder is already what
        // is on screen, so there is nothing to do but stop trying.
      }
    };

    if (eager) {
      void load();
      return () => {
        cancelled = true;
        controller.abort();
      };
    }

    /*
      IntersectionObserver rather than a plain effect, so a catalogue page of
      cards does not fire a request per card the moment it renders. `rootMargin`
      starts the fetch a little before the card is actually reached, so the
      photo is usually there by the time it is.
    */
    const node = boxRef.current;
    if (!node) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          observer.disconnect();
          void load();
        }
      },
      { rootMargin: "300px" },
    );
    observer.observe(node);

    return () => {
      cancelled = true;
      controller.abort();
      observer.disconnect();
    };
  }, [orderId, eager]);

  const showPhoto = src !== null && !failed;

  return (
    <div ref={boxRef} className={className}>
      {showPhoto ? (
        /*
          Plain <img>, not next/image: these are remote files on a host we do
          not control, and optimising them would proxy every one through our
          own server for no gain. `onError` covers a URL that resolves but
          fails to decode — without it a broken-image glyph would sit where
          the placeholder should be.
        */
        // eslint-disable-next-line @next/next/no-img-element -- remote lot photo on a host we do not control; see above.
        <img
          src={src}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover transition-transform duration-[600ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.05]"
        />
      ) : (
        <ImagePlaceholder className="transition-transform duration-[600ms] ease-[cubic-bezier(0.25,1,0.5,1)] group-hover:scale-[1.05]" />
      )}
    </div>
  );
}
