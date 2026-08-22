"use client";

import { useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

/*
  A row of cards that drifts continuously and stops when you point at it.

  NOT `CardRotator`, the other thing on this page: that holds three slots and
  swaps their CONTENTS on a timer, because a whole auction day's lots cannot be
  on screen and their order carries no information. Here the order IS the
  information — highest sale first — so the row keeps it and moves instead.

  ── WHY THERE IS NO SCROLL-SNAP ────────────────────────────────────────────
  There was, and it is why the first version stuttered. `snap-mandatory` means
  the browser owns the resting position: every frame the drift moves the track
  a fraction of a card, snap pulls it back toward the nearest card edge, and
  the two fight each other continuously. It also cut the arrows short — a
  `scrollBy` that lands between two snap points gets re-aimed mid-flight, which
  reads as the animation being interrupted. Continuous motion and mandatory
  snapping cannot both be right; the motion is what was asked for.

  ── WHY THE TRACK IS DUPLICATED ────────────────────────────────────────────
  A marquee has to wrap, and jumping from the end back to zero is visible. With
  the children rendered twice, the halves are identical, so resetting by
  exactly half the scroll width lands on a frame that looks the same as the one
  before it. The copy carries `inert`, which takes it out of the tab order and
  the accessibility tree in one attribute — otherwise every card would be
  announced and tabbed through twice.

  ── ONE ANIMATION SOURCE ───────────────────────────────────────────────────
  A single rAF loop owns `scrollLeft`. The drift and the arrow nudges both feed
  it, rather than the arrows calling `scrollBy({behavior:"smooth"})` on the
  side — two things writing the same property in the same frame is the other
  half of what made this judder. The loop reads the real `scrollLeft` back each
  frame, so a reader dragging the row with a trackpad simply takes over and the
  drift resumes from wherever they left it.

  Nothing here is React state: state would re-render twelve cards sixty times a
  second to move one number. Refs and the DOM only.
*/

/** Pixels per second. Slow enough to read a card as it passes. */
const DRIFT_SPEED = 34;

/** How long an arrow press takes to play out, in ms. */
const NUDGE_MS = 420;

/** Cubic ease-out — the same shape the CSS transitions on the cards use. */
const easeOut = (t: number) => 1 - Math.pow(1 - t, 3);

export function CardCarousel({
  children,
  labels,
  className,
}: {
  children: React.ReactNode;
  labels: { prev: string; next: string };
  className?: string;
}) {
  const trackRef = useRef<HTMLUListElement>(null);
  const pausedRef = useRef(false);
  /** Distance still owed to the reader from an arrow press, in px. */
  const nudgeRef = useRef({ remaining: 0, total: 0, elapsed: 0 });

  useEffect(() => {
    const track = trackRef.current;
    if (!track) return;

    // Auto-advancing content is exactly what this setting asks us not to do.
    // The row is still scrollable by hand; it just never moves on its own.
    const motionOk = !window.matchMedia("(prefers-reduced-motion: reduce)")
      .matches;

    const hold = () => (pausedRef.current = true);
    const release = () => (pausedRef.current = false);

    /*
      `mouseenter`/`mouseleave` rather than React's synthetic enter/leave: they
      do not bubble, so a pointer moving between two cards inside the row never
      reads as leaving it. `focusin`/`focusout` for the keyboard — a row that
      slides while you are tabbing through its links moves the target out from
      under you, which breaks rather than annoys.
    */
    track.addEventListener("mouseenter", hold);
    track.addEventListener("mouseleave", release);
    track.addEventListener("focusin", hold);
    track.addEventListener("focusout", release);
    // A touch is a deliberate grab; the drift resumes when the finger lifts.
    track.addEventListener("touchstart", hold, { passive: true });
    track.addEventListener("touchend", release, { passive: true });

    let raf = 0;
    let last = performance.now();
    // What we last wrote, so a mismatch tells us the reader moved the row.
    let written = track.scrollLeft;

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);

      const dt = Math.min((now - last) / 1000, 0.05); // clamp after a stall
      last = now;

      // The reader scrolled: adopt their position instead of fighting it.
      if (Math.abs(track.scrollLeft - written) > 1) written = track.scrollLeft;

      let delta = 0;

      const nudge = nudgeRef.current;
      if (nudge.remaining !== 0) {
        nudge.elapsed = Math.min(nudge.elapsed + dt * 1000, NUDGE_MS);
        const progress = easeOut(nudge.elapsed / NUDGE_MS);
        const done = nudge.total * progress;
        delta += done - (nudge.total - nudge.remaining);
        nudge.remaining = nudge.total - done;
        if (nudge.elapsed >= NUDGE_MS) {
          nudge.remaining = 0;
          nudge.total = 0;
          nudge.elapsed = 0;
        }
      } else if (motionOk && !pausedRef.current) {
        delta += DRIFT_SPEED * dt;
      }

      if (delta === 0) return;

      let next = written + delta;

      /*
        The halves are identical, so subtracting exactly half the scroll width
        puts the same pixels under the same cards. Guarded against a zero width
        — during the first frames after mount the images have no size yet and
        `half` can be 0, which would loop forever.
      */
      const half = track.scrollWidth / 2;
      if (half > 0) {
        if (next >= half) next -= half;
        else if (next < 0) next += half;
      }

      track.scrollLeft = next;
      written = next;
    };

    raf = requestAnimationFrame(frame);

    /*
      No `visibilitychange` listener. Browsers stop servicing rAF in a hidden
      tab, so the loop pauses itself — and a listener that flipped the same
      flag the pointer handlers use would clobber a hover pause the moment the
      reader switched tabs and came back. The `dt` clamp above absorbs the one
      long frame that arrives when the tab is shown again.
    */
    return () => {
      cancelAnimationFrame(raf);
      track.removeEventListener("mouseenter", hold);
      track.removeEventListener("mouseleave", release);
      track.removeEventListener("focusin", hold);
      track.removeEventListener("focusout", release);
      track.removeEventListener("touchstart", hold);
      track.removeEventListener("touchend", release);
    };
  }, []);

  const nudge = (direction: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.firstElementChild as HTMLElement | null;
    const step = card ? card.getBoundingClientRect().width + 20 : 320;
    const total = step * direction;
    nudgeRef.current = { remaining: total, total, elapsed: 0 };
  };

  return (
    <div className={cn("relative", className)}>
      <ul
        ref={trackRef}
        /*
          `-mx-*` + matching padding so the row bleeds to the container edge on
          a phone — a card clipped flush at the viewport edge is what tells a
          reader there is more to the right.

          `scrollbar-none` is defined in globals.css: on Windows the bar is a
          permanent band under the cards that changes the row's height, and a
          row that moves on its own has no use for a drag handle.
        */
        className="-mx-5 flex scrollbar-none gap-5 overflow-x-auto px-5 pb-2 sm:-mx-8 sm:px-8"
      >
        {children}

        {/*
          The wrap copy. `inert` keeps it out of the tab order and the
          accessibility tree; `contents` keeps its children as direct flex
          items of the track, so the duplicate does not become one wide column.
        */}
        <div className="contents" inert>
          {children}
        </div>
      </ul>

      {/*
        Hidden below `sm`: a phone has the swipe already, and two 40px buttons
        over a card are only in the way. `aria-hidden` because the row itself is
        reachable and scrollable without them — a screen reader user tabs
        through the cards, and two controls that only duplicate that are noise.
      */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 left-0 hidden items-center justify-between sm:flex"
      >
        <button
          type="button"
          tabIndex={-1}
          onClick={() => nudge(-1)}
          aria-label={labels.prev}
          className="border-hairline bg-card text-foreground hover:border-outline pointer-events-auto -ml-3 flex size-10 items-center justify-center rounded-full border [box-shadow:var(--shadow-1)] transition-colors"
        >
          <ChevronLeft aria-hidden="true" className="size-5" />
        </button>
        <button
          type="button"
          tabIndex={-1}
          onClick={() => nudge(1)}
          aria-label={labels.next}
          className="border-hairline bg-card text-foreground hover:border-outline pointer-events-auto -mr-3 flex size-10 items-center justify-center rounded-full border [box-shadow:var(--shadow-1)] transition-colors"
        >
          <ChevronRight aria-hidden="true" className="size-5" />
        </button>
      </div>
    </div>
  );
}
