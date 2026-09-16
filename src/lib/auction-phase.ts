/*
  Has a lot's auction moment arrived?

  ONE QUESTION, AND NOT THE ONE THIS FILE USED TO ANSWER. It also worked out
  whether an auction was still OPEN, by treating the auction's own Tashkent
  day as the window — the listings feed sends a start timestamp and nothing
  else, so there was nothing better to infer from. The inference was wrong in
  the way inference usually is: an e-auksion room closes minutes after it
  opens, so a lot that finished at 10:12 stayed marked as live until midnight.

  Which lots are live is now ANSWERED rather than guessed — e-auksion
  publishes the open rooms and `lib/data/live-auctions.ts` reads them. What is
  left here is the countdown caption's own question: is the start still ahead
  of us, or behind? That is a comparison against one timestamp, it is needed
  in the browser, and it needs no service.

  CLIENT-SAFE ON PURPOSE. `lib/data/listings.ts` opens with `import
  "server-only"`, so a client component importing from it drags the server
  module into the bundle and the build fails — the same reason
  `lib/listings-view.ts` exists separately.
*/

/**
 * When the auction opens, as an epoch millisecond value.
 *
 * `null` for a lot with no auction date and for a date upstream sent in a
 * shape `Date` cannot read — both are "we cannot say", never "now".
 */
export function auctionStartAt(iso: string | undefined): number | null {
  if (!iso) return null;
  const at = new Date(iso).getTime();
  return Number.isFinite(at) ? at : null;
}

/**
 * Whether the auction's start has passed, or `null` when there is no usable
 * date to compare against.
 */
export function auctionStarted(
  iso: string | undefined,
  now: number,
): boolean | null {
  const at = auctionStartAt(iso);
  return at == null ? null : now >= at;
}

/**
 * The next moment this answer changes for the given lot, or `null` if it never
 * will again.
 *
 * Callers use it to sleep until the boundary instead of ticking: once an
 * auction has started, nothing here changes for that lot ever again.
 */
export function nextAuctionStart(
  iso: string | undefined,
  now: number,
): number | null {
  const at = auctionStartAt(iso);
  if (at == null) return null;
  return now < at ? at : null;
}
