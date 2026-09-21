import { useSyncExternalStore } from "react";

import { withBasePath } from "@/lib/base-path";

/*
  The open bidding rooms, as the BROWSER sees them.

  ONE POLL FOR THE WHOLE PAGE. The map's live pins, the explorer's "Jonli
  savdolar" tab, the homepage strip, /joriy-savdolar and the menu entry all
  read this — five places that must agree. Each used to run its own interval,
  so on one screen the tab said 17 while the strip's link said 21: two answers
  taken at different moments. Now a single module-level store polls once and
  every subscriber re-renders from the same answer at the same time.

  EVERY 30 SECONDS, at the operator's request, and that is also the floor the
  data allows: `/api/live-auctions` is uncached for the browser and the
  upstream list behind it is cached for 30 seconds (lib/data/live-auctions.ts),
  so polling faster would only re-read the same answer.

  CLIENT-SIDE ON PURPOSE. Whether anything is live changes in minutes, and the
  menu sits in the root layout: reading it on the server would pull every page
  on the site down to a 30-second revalidation window just so one menu entry
  could come and go.

  STARTS "NOT READY" AND FAILS CLOSED. Nothing counts as live until the first
  answer arrives, and a failed refresh keeps the previous answer rather than
  clearing it — one bad response should not blink every pin. Callers that
  have a server-rendered answer of their own use `ready` to keep showing it
  until this one arrives. See lib/data/live-auctions.ts for why this is asked
  of e-auksion at all.
*/

export { LIVE_STRIP_LIMIT } from "@/lib/live-auctions-limit";

const POLL_MS = 30_000;

export interface LiveAuctionsState {
  /** e-auksion lot numbers whose room is open, including lots we do not hold. */
  lots: ReadonlySet<string>;
  /**
   * How many of those are in OUR feed — the lots a card or a pin can actually
   * be drawn for. This, not `lots.size`, is what decides whether there is
   * anything to show: e-auksion also runs sales that are not ours.
   */
  listed: number;
  /** False until the first successful answer. */
  ready: boolean;
}

const EMPTY: LiveAuctionsState = { lots: new Set(), listed: 0, ready: false };

let state: LiveAuctionsState = EMPTY;
const listeners = new Set<() => void>();
let timer: number | undefined;

async function load(): Promise<void> {
  try {
    const res = await fetch(withBasePath("/api/live-auctions"), {
      cache: "no-store",
    });
    // 503 is the route saying "no answer" rather than "nobody is live".
    if (!res.ok) return;
    const data: unknown = await res.json();
    if (typeof data !== "object" || data === null) return;

    const { lots, listed } = data as { lots?: unknown; listed?: unknown };
    if (!Array.isArray(lots)) return;

    state = {
      lots: new Set(lots.map(String)),
      listed: typeof listed === "number" && listed >= 0 ? listed : 0,
      ready: true,
    };
    for (const listener of listeners) listener();
  } catch {
    // Offline, or the reader navigated away mid-flight. Keep what we have.
  }
}

/*
  The poll runs while anything is listening and stops when nothing is, so a
  page with none of these components makes no requests at all.
*/
function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  if (listeners.size === 1) {
    void load();
    timer = window.setInterval(() => void load(), POLL_MS);
  }
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && timer !== undefined) {
      window.clearInterval(timer);
      timer = undefined;
    }
  };
}

export function useLiveAuctions(): LiveAuctionsState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    // The server has no poll; server-rendered markup never depends on this.
    () => EMPTY,
  );
}
