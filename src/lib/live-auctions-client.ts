import { useEffect, useState } from "react";

import { withBasePath } from "@/lib/base-path";

/*
  The open bidding rooms, as the BROWSER sees them.

  ONE HOOK FOR EVERY PLACE THAT ASKS: the map's live pins, the explorer's
  "Jonli savdolar" tab and the menu's "Joriy savdolar" entry. Three copies of
  the fetch would be three answers that can disagree for a minute — a tab
  showing live lots while the menu says there are none.

  CLIENT-SIDE ON PURPOSE. Whether anything is live changes in minutes, and the
  menu sits in the root layout: reading it on the server would pull every
  page on the site down to a 30-second revalidation window just so one menu
  entry could come and go. Asked here, the pages stay cached and only this
  small request is repeated. `/api/live-auctions` answers with
  `Cache-Control: max-age=30`, so the three callers on one page share one
  response rather than making three.

  STARTS EMPTY AND FAILS CLOSED. Nothing counts as live until the first answer
  arrives, and a failed refresh keeps the previous answer rather than clearing
  it — one bad response should not blink every pin. See
  lib/data/live-auctions.ts for why this is asked of e-auksion at all.
*/

export { LIVE_STRIP_LIMIT } from "@/lib/live-auctions-limit";

/** A room turns over in minutes, so the list is re-read on the minute. */
const POLL_MS = 60_000;

export interface LiveAuctionsState {
  /** e-auksion lot numbers whose room is open, including lots we do not hold. */
  lots: ReadonlySet<string>;
  /**
   * How many of those are in OUR feed — the lots a card or a pin can actually
   * be drawn for. This, not `lots.size`, is what decides whether there is
   * anything to show: e-auksion also runs sales that are not ours.
   */
  listed: number;
}

const EMPTY: LiveAuctionsState = { lots: new Set(), listed: 0 };

export function useLiveAuctions(): LiveAuctionsState {
  const [state, setState] = useState<LiveAuctionsState>(EMPTY);

  useEffect(() => {
    let active = true;

    const load = async () => {
      try {
        const res = await fetch(withBasePath("/api/live-auctions"));
        // 503 is the route saying "no answer" rather than "nobody is live".
        if (!res.ok) return;
        const data: unknown = await res.json();
        if (!active || typeof data !== "object" || data === null) return;

        const { lots, listed } = data as { lots?: unknown; listed?: unknown };
        if (!Array.isArray(lots)) return;
        setState({
          lots: new Set(lots.map(String)),
          listed: typeof listed === "number" && listed >= 0 ? listed : 0,
        });
      } catch {
        // Offline, or the reader navigated away mid-flight. Keep what we have.
      }
    };

    void load();
    const id = window.setInterval(() => void load(), POLL_MS);
    return () => {
      active = false;
      window.clearInterval(id);
    };
  }, []);

  return state;
}
