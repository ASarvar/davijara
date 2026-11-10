"use client";

import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/*
  A sideways row with arrow buttons and NO visible scrollbar — the still
  sibling of CardCarousel, for rows that should not drift (the homepage's
  "Video sharhlar", operator 10.11.2026: "pastdagi scroll kerak emas").

  Hiding the scrollbar takes away the one thing a mouse without a trackpad
  could scroll this row with, so the arrows are not decoration: they are how
  that reader reaches the cards off the right edge.

  ONE CARD PER PRESS, and HOLDING keeps it going (operator, 10.11.2026): a
  press moves exactly one card; held past HOLD_DELAY it steps again every
  HOLD_EVERY, each step re-aimed at the next card from where the last one was
  headed, so the row slides on smoothly instead of stopping card by card. The
  steps land on card edges, which is also where the row's scroll-snap rests,
  so the two never pull against each other.

  An arrow is hidden at its end of the row, so a button never does nothing.
  Same markup and reasoning as CardCarousel for keeping them out of the
  accessibility tree: every card is a link, so Tab walks the row and the
  browser scrolls the focused card into view. Touch scrolls the row natively,
  and the arrows are not drawn below `sm`.

  `controlsClassName` places the arrows' band. By default it spans the whole
  row; a caller whose cards carry a caption under the picture passes the
  picture's own height, so the arrow sits on the middle of the image rather
  than of image-plus-caption.
*/
const HOLD_DELAY = 380;
const HOLD_EVERY = 260;

export function ScrollRow({
  children,
  labels,
  listClassName,
  controlsClassName = "inset-y-0",
}: {
  children: React.ReactNode;
  labels: { prev: string; next: string };
  listClassName?: string;
  controlsClassName?: string;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  /** Where the current run of steps is headed; null when idle. */
  const target = useRef<number | null>(null);
  const timers = useRef<{ delay?: number; repeat?: number }>({});

  useEffect(() => {
    const el = track.current;
    if (!el) return;
    const update = () => {
      setEdges({
        start: el.scrollLeft <= 4,
        end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4,
      });
    };
    // A finished scroll with no button held forgets the last aim, so the
    // next press starts from where the row actually is.
    const settle = () => {
      if (timers.current.repeat === undefined) target.current = null;
    };
    update();
    el.addEventListener("scroll", update, { passive: true });
    el.addEventListener("scrollend", settle);
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      el.removeEventListener("scrollend", settle);
      window.removeEventListener("resize", update);
      stop();
    };
  }, []);

  /** One card's width plus the gap after it. */
  const cardStep = (el: HTMLUListElement) => {
    const first = el.firstElementChild as HTMLElement | null;
    if (!first) return el.clientWidth;
    const gap = parseFloat(getComputedStyle(el).columnGap) || 0;
    return first.offsetWidth + gap;
  };

  const step = (direction: -1 | 1) => {
    const el = track.current;
    if (!el) return;
    const size = cardStep(el);
    const max = el.scrollWidth - el.clientWidth;
    const from = target.current ?? el.scrollLeft;
    // Land on a card edge: the index of the card at `from`, plus one.
    const next = Math.min(
      max,
      Math.max(0, (Math.round(from / size) + direction) * size),
    );
    // At the end of the row: the arrow is about to hide, and a hidden
    // button never hears the release, so the run ends here.
    if (Math.abs(next - el.scrollLeft) < 1 && target.current !== null) {
      stop();
      return;
    }
    target.current = next;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: next, behavior: still ? "auto" : "smooth" });
  };

  function stop() {
    window.clearTimeout(timers.current.delay);
    window.clearInterval(timers.current.repeat);
    timers.current = {};
  }

  const start = (direction: -1 | 1) => (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    stop();
    target.current = null;
    step(direction);
    // Released anywhere — off the button, or after it hid — ends the run.
    window.addEventListener("pointerup", stop, { once: true });
    timers.current.delay = window.setTimeout(() => {
      timers.current.repeat = window.setInterval(
        () => step(direction),
        HOLD_EVERY,
      );
    }, HOLD_DELAY);
  };

  const button =
    "border-hairline bg-card text-foreground hover:border-outline pointer-events-auto flex size-10 touch-none items-center justify-center rounded-full border [box-shadow:var(--shadow-1)] transition-[opacity,border-color] select-none";

  return (
    <div className="relative">
      <ul ref={track} className={cn("scrollbar-none", listClassName)}>
        {children}
      </ul>
      <div
        aria-hidden="true"
        className={cn(
          "pointer-events-none absolute right-0 left-0 hidden items-center justify-between sm:flex",
          controlsClassName,
        )}
      >
        <button
          type="button"
          tabIndex={-1}
          onPointerDown={start(-1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={labels.prev}
          className={cn(button, "-ml-3", edges.start && "invisible opacity-0")}
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          onPointerDown={start(1)}
          onPointerUp={stop}
          onPointerLeave={stop}
          onPointerCancel={stop}
          onContextMenu={(e) => e.preventDefault()}
          aria-label={labels.next}
          className={cn(button, "-mr-3", edges.end && "invisible opacity-0")}
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>
      </div>
    </div>
  );
}
