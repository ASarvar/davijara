import type { NavItem } from "@/content/site";
import { LIVE_STRIP_LIMIT } from "@/lib/live-auctions-limit";

/*
  Whether a menu entry is on show right now.

  Almost every entry always is. The exception is `when: "manyLiveAuctions"` —
  "Joriy savdolar" under Faoliyat — which the operator asked to appear only
  while more lots are live than the homepage strip can hold. Below that the
  strip already shows every one, and a menu entry leading to the same six
  cards (or to none) is a way in to nothing new.

  Decided in the browser, from the same `listed` count the strip and the
  explorer use (lib/live-auctions-client.ts). The menu is in the root layout,
  and answering this on the server would drag every page down to a
  30-second revalidation window for one conditional link.
*/
export function isNavItemShown(item: NavItem, liveListed: number): boolean {
  if (item.when === "manyLiveAuctions") return liveListed > LIVE_STRIP_LIMIT;
  return true;
}
