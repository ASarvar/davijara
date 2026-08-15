"use client";

import { Children, cloneElement, isValidElement, useEffect, useRef, useState } from "react";

/*
  Shows a window of `perView` children and rotates through the rest.

  The children are rendered on the SERVER and handed here already built — this
  component only decides which slice is on screen. That keeps `LotCard` a
  Server Component and keeps the lot data out of the client bundle as props.

  ── HOW THE SWAP READS ──────────────────────────────────────────────────
  One card at a time, never the whole row. A slot's outgoing card rises and
  fades out; its replacement rises in from below. The next slot only starts
  once the one before it has finished, so the row turns over as a wave from
  left to right rather than blinking all at once.

  The previous version replaced all `perView` items in a single setState with
  no animation at all — an instant hard cut of the entire row, which is what
  made it read as "too fast". Nothing was actually animating; there was simply
  nothing between one row and the next.

  ── PAUSES ON HOVER AND ON FOCUS ────────────────────────────────────────
  Hover because a set of cards that reshuffles while you are reading one is
  hostile. Focus because a keyboard user tabbing through the links would
  otherwise have the target moved out from under them mid-tab — the same
  problem, and the one that actually breaks rather than annoys.

  The pause is re-checked before EACH slot in a wave, not just before the
  wave starts, so pointing at the row stops it within one step instead of
  letting the remaining cards turn over anyway. A swap already in flight is
  always allowed to finish: aborting between the out and in halves is the one
  way a card could be left invisible.

  It also stops when the tab is hidden (no point animating into a background
  tab) and never starts at all under `prefers-reduced-motion`, where auto-
  advancing content is exactly what the setting is asking us not to do. The
  first slice simply stays put in that case.
*/

/** Kept in step with the keyframes in globals.css — see `lot-swap-out`. */
const OUT_MS = 400;
const IN_MS = 460;
/** Beat between one slot finishing and the next starting. */
const GAP_MS = 120;
const STEP_MS = OUT_MS + IN_MS + GAP_MS;

export function CardRotator({
  children,
  perView = 3,
  /**
   * Seconds between the START of each wave. The wave itself takes
   * `perView * STEP_MS` (~2.9s at the default three), so this must stay
   * comfortably above that or the row never rests.
   */
  interval = 10,
  className,
}: {
  children: React.ReactNode;
  perView?: number;
  interval?: number;
  className?: string;
}) {
  const items = Children.toArray(children);
  const total = items.length;
  const slotCount = Math.min(perView, total);

  const [slots, setSlots] = useState(() =>
    Array.from({ length: slotCount }, (_, i) => i),
  );
  const paused = useRef(false);
  const listRef = useRef<HTMLUListElement>(null);

  /*
    The rendered indices, mirrored into a ref.

    Every decision below (which item comes next, which are already on screen)
    is made OUTSIDE the setState updater and written here first. Putting that
    logic inside the updater would make it impure, and React invokes updaters
    twice in StrictMode — the cursor would advance twice per swap and skip a
    lot every time.
  */
  const slotsRef = useRef(slots);
  const cursor = useRef(slotCount);

  const canRotate = total > slotCount;

  useEffect(() => {
    if (!canRotate) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const list = listRef.current;
    if (!list) return;

    /*
      Native listeners rather than React's `onMouseEnter`/`onFocus` props.

      React synthesises enter/leave from delegated `mouseover`/`mouseout` at
      the root, which means the pause depends on that synthesis firing exactly
      as expected. Binding straight to the element removes a layer that can
      only go wrong, and `mouseenter`/`mouseleave` do not bubble, so a pointer
      moving between two cards inside the list never reads as leaving it.
    */
    const hold = () => (paused.current = true);
    const release = () => (paused.current = false);

    list.addEventListener("mouseenter", hold);
    list.addEventListener("mouseleave", release);
    // Keyboard equivalent: tabbing into a card must not have the link move.
    list.addEventListener("focusin", hold);
    list.addEventListener("focusout", release);

    const timers = new Set<number>();
    const later = (fn: () => void, ms: number) => {
      const id = window.setTimeout(() => {
        timers.delete(id);
        fn();
      }, ms);
      timers.add(id);
    };

    /** Next pool item that is not already on screen. */
    const pickNext = () => {
      for (let tries = 0; tries < total; tries++) {
        const candidate = cursor.current % total;
        cursor.current = (cursor.current + 1) % total;
        if (!slotsRef.current.includes(candidate)) return candidate;
      }
      return cursor.current % total;
    };

    /*
      `data-swap` is written straight to the DOM rather than held in React
      state, and the slot keys below are what make that safe: the <li> for a
      given slot is the SAME node across a content change, so an attribute set
      here survives the swap. Routing it through state instead would mean
      threading a prop through LotCard — a component shared with the map
      explorer — purely to carry a transient animation flag.
    */
    const swapSlot = (k: number) => {
      const node = list.children[k] as HTMLElement | undefined;
      if (!node) return;

      node.setAttribute("data-swap", "out");

      later(() => {
        const next = pickNext();
        const updated = [...slotsRef.current];
        updated[k] = next;
        slotsRef.current = updated;
        setSlots(updated);

        /*
          Flipping the attribute in the same callback that swaps the content
          is deliberate: "out" ends held at opacity 0 (fill-mode forwards) so
          the old card cannot flash back at full opacity for the frame before
          "in" begins. Because both happen here, there is no path where the
          card is left holding that hidden end state.
        */
        node.setAttribute("data-swap", "in");
        later(() => node.removeAttribute("data-swap"), IN_MS);
      }, OUT_MS);
    };

    const runWave = () => {
      for (let k = 0; k < slotCount; k++) {
        later(() => {
          if (paused.current || document.visibilityState === "hidden") return;
          swapSlot(k);
        }, k * STEP_MS);
      }
    };

    const id = window.setInterval(() => {
      if (paused.current || document.visibilityState === "hidden") return;
      runWave();
    }, interval * 1000);

    return () => {
      window.clearInterval(id);
      for (const t of timers) window.clearTimeout(t);
      // Any card caught mid-swap must not be torn down still hidden.
      for (const child of Array.from(list.children)) {
        (child as HTMLElement).removeAttribute("data-swap");
      }
      list.removeEventListener("mouseenter", hold);
      list.removeEventListener("mouseleave", release);
      list.removeEventListener("focusin", hold);
      list.removeEventListener("focusout", release);
    };
  }, [canRotate, slotCount, interval, total]);

  /*
    Keyed by SLOT, not by item.

    The children arrive with their own keys (the lot id), which would make
    React unmount the old <li> and mount a new one on every swap — throwing
    away the node mid-animation, and with it both the `data-swap` attribute
    and the `data-revealed` stamp the motion provider put there. A stable
    per-slot key reconciles the card's contents in place instead, so the
    element animating is the element that stays.
  */
  const visible = slots.map((itemIndex, slot) => {
    const item = items[itemIndex];
    return isValidElement(item)
      ? cloneElement(item, { key: `slot-${slot}` })
      : item;
  });

  return (
    <ul ref={listRef} className={className}>
      {visible}
    </ul>
  );
}
