"use client";

import { Children, useEffect, useRef, useState } from "react";

/*
  Shows a window of `perView` children and rotates through the rest.

  The children are rendered on the SERVER and handed here already built — this
  component only decides which slice is on screen. That keeps `LotCard` a
  Server Component and keeps the lot data out of the client bundle as props.

  PAUSES ON HOVER AND ON FOCUS
  Hover because a set of cards that reshuffles while you are reading one is
  hostile. Focus because a keyboard user tabbing through the links would
  otherwise have the target moved out from under them mid-tab — the same
  problem, and the one that actually breaks rather than annoys.

  It also stops when the tab is hidden (no point animating into a background
  tab) and never starts at all under `prefers-reduced-motion`, where auto-
  advancing content is exactly what the setting is asking us not to do. The
  first slice simply stays put in that case.
*/
export function CardRotator({
  children,
  perView = 3,
  /** Seconds each slice stays on screen. */
  interval = 8,
  className,
}: {
  children: React.ReactNode;
  perView?: number;
  interval?: number;
  className?: string;
}) {
  const items = Children.toArray(children);
  const [offset, setOffset] = useState(0);
  const paused = useRef(false);
  const listRef = useRef<HTMLUListElement>(null);

  const total = items.length;
  const canRotate = total > perView;

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

    const id = window.setInterval(() => {
      if (paused.current || document.visibilityState === "hidden") return;
      setOffset((o) => (o + perView) % total);
    }, interval * 1000);

    return () => {
      window.clearInterval(id);
      list.removeEventListener("mouseenter", hold);
      list.removeEventListener("mouseleave", release);
      list.removeEventListener("focusin", hold);
      list.removeEventListener("focusout", release);
    };
  }, [canRotate, perView, interval, total]);

  /*
    Wraps around the end, so a pool that does not divide evenly by `perView`
    still fills every slot instead of showing a short final row.
  */
  const visible = Array.from(
    { length: Math.min(perView, total) },
    (_, i) => items[(offset + i) % total],
  );

  return (
    <ul ref={listRef} className={className}>
      {visible}
    </ul>
  );
}
