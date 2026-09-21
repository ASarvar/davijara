"use client";

import { Children, type ReactNode } from "react";

import { LIVE_STRIP_LIMIT, useLiveAuctions } from "@/lib/live-auctions-client";

/*
  Live-lot cards that drop out as their rooms close.

  The cards are rendered on the SERVER — that is where the lot data lives, and
  it keeps it out of the client bundle — so on their own they are a snapshot
  of the moment the page was built. A room closes minutes after it opens, and
  a reader who leaves the homepage open would otherwise keep a card inviting
  them into a room that shut ten minutes ago, beside a tab whose count (kept
  current by the 30-second poll) says it is gone.

  So each card is paired with its lot number, and once the shared poll has
  answered, a card whose number is no longer live is simply not rendered.
  Until that first answer arrives the server's cards stand as they are — the
  server's list was itself read from e-auksion moments earlier.

  It can only take cards AWAY. A room that opens after the page was built has
  no server-rendered card to show; it appears in the tab and on the map at
  once, and here on the next page load.
*/

/**
 * The list of cards, minus any whose room has closed, cut to `limit`.
 *
 * The server hands over MORE cards than are shown, so a closed room's place
 * is taken by the next live one rather than leaving a gap — the strip keeps
 * showing up to six for as long as six are open.
 */
export function LiveCardList({
  lots,
  limit,
  className,
  children,
}: {
  /** Lot number of each child, in the same order as the children. */
  lots: (string | undefined)[];
  /** How many to show at most; all of them when omitted. */
  limit?: number;
  className?: string;
  children: ReactNode;
}) {
  const { lots: live, ready } = useLiveAuctions();
  const cards = Children.toArray(children);
  const open = ready
    ? cards.filter((_, i) => {
        const lot = lots[i];
        return lot != null && live.has(lot);
      })
    : cards;

  return (
    <ul className={className}>{limit == null ? open : open.slice(0, limit)}</ul>
  );
}

/**
 * Renders its children only while more lots are live than the strip holds —
 * the "Barcha joriy savdolar" link, which must come and go with the menu
 * entry of the same name (lib/nav-visibility.ts) rather than stay fixed at
 * whatever was true when the page was built. Until the poll first answers,
 * the server's own count decides.
 */
export function LiveMoreGate({
  serverHasMore,
  children,
}: {
  serverHasMore: boolean;
  children: ReactNode;
}) {
  const { listed, ready } = useLiveAuctions();
  const hasMore = ready ? listed > LIVE_STRIP_LIMIT : serverHasMore;
  return hasMore ? <>{children}</> : null;
}

/**
 * Renders its children only while at least one of `lots` is still live —
 * so a section whose every room has closed disappears with its heading,
 * rather than leaving a title over an empty row.
 */
export function LiveGate({
  lots,
  children,
}: {
  lots: (string | undefined)[];
  children: ReactNode;
}) {
  const { lots: live, ready } = useLiveAuctions();
  if (ready && !lots.some((lot) => lot != null && live.has(lot))) return null;
  return <>{children}</>;
}
