"use client";

import { useEffect } from "react";
import Lenis from "lenis";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";

import { usePathname } from "@/i18n/navigation";

/*
  The one motion controller.

  Everything animated on the site is driven from here, off plain HTML
  attributes:

    data-reveal="up|down|left|right|fade|scale"   arrives once, on entry
    data-split                                    heading, revealed line by line
    data-clip                                     wipes up from its bottom edge
    data-parallax="0.12"                          drifts against the scroll

  WHY ONE CONTROLLER AND NOT `motion.div` EVERYWHERE
  Attribute-driven means the sections stay Server Components. Wrapping each
  animated element in a client component would pull nine section files across
  the server/client boundary and ship their markup twice. This is one client
  island that reads the DOM the server already rendered — the same approach
  era-residence.com uses with its `data-scroll-reveal` attributes.

  Timings follow the reference sites rather than taste: 0.8s at power3.out —
  the easeOutQuart ERA uses on 25 elements — with a 70ms cascade.
*/

gsap.registerPlugin(ScrollTrigger, SplitText);

const EASE = "power3.out";
const DURATION = 0.8;
/** Gap between neighbours in a cascade. */
const STAGGER = 0.15;
/** No cascade may run longer than this, however many items are in it. */
const STAGGER_CAP = 0.7;
const RISE = 24;
const SHIFT = 40;

/** Fires a little before the element is fully in view, so it is already
 *  moving by the time the reader's eye arrives. */
const START = "top 88%";

/*
  Where each kind travels from.

  Direction is not decoration — it carries meaning, so it is chosen per
  section in the markup rather than varied at random here:

    up      grids of cards; the default sense of "arriving"
    left    list rows and ordered steps, which are read along their length
    down    things that belong to what is above them
    scale   logos and marks, which have no direction of their own
    fade    blocks whose children do the moving (a section header's heading
            is split into lines separately — moving both reads as a wobble)
*/
const FROM: Record<string, gsap.TweenVars> = {
  up: { y: RISE },
  down: { y: -RISE },
  left: { x: -SHIFT },
  right: { x: SHIFT },
  scale: { scale: 0.94 },
  fade: {},
};

declare global {
  interface Window {
    __motionReady?: boolean;
  }
}

export function MotionProvider() {
  const pathname = usePathname();

  useEffect(() => {
    // Honour the OS setting. The arming script already skipped hiding
    // anything, so there is genuinely nothing to do here.
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const root = document.documentElement;
    const splits: SplitText[] = [];
    const ctx = gsap.context(() => {});

    /*
      Marks an element as handled. The CSS start states are written
      `:not([data-revealed])`, so stamping this is what makes the reveal
      permanent — and what stops a re-run (route change, tab switch) from
      hiding something that has already been read.
    */
    const done = (el: Element) => el.setAttribute("data-revealed", "");

    /* ── Smooth scroll ──────────────────────────────────────────────────
       Lenis replaces the wheel's 1:1 mapping with an eased follow. This is
       the single biggest contributor to the "expensive" feel on all three
       reference sites — and the reason ScrollTrigger has to be driven from
       Lenis's own loop below, rather than from the native scroll event. */
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
      /*
        Touch is left alone deliberately. Mobile browsers hand scrolling to
        the compositor and hide the URL bar as part of it; intercepting that
        makes the page feel worse than native, not better.
      */
      syncTouch: false,
    });

    lenis.on("scroll", ScrollTrigger.update);
    const ticker = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(ticker);
    // GSAP's lag smoothing fights Lenis's own interpolation.
    gsap.ticker.lagSmoothing(0);

    /* ── Reveals ────────────────────────────────────────────────────────

       `ScrollTrigger.batch` rather than one trigger per element.

       The first version gave every element its own trigger plus a `delay`
       taken from an inline `--i`, and it did not cascade: `--i` was written
       `index % 3` / `% 6`, so the fourth card in a grid restarted at delay 0
       and went off at the same instant as the first. Worse, a card lower in a
       tall grid crossed the trigger line later AND carried a delay, so the
       lag compounded.

       `batch` collects whatever crosses the line in the same frame and
       staggers that set — a grid row cascades, the next row gets its own
       cascade when it arrives. No index bookkeeping in the markup at all.

       Batched per direction, because a batch shares one `from` state. */
    const batchReveals = (els: HTMLElement[], kind: string) => {
      if (els.length === 0) return;
      const offset = FROM[kind] ?? FROM.up;

      ScrollTrigger.batch(els, {
        start: START,
        once: true,
        onEnter: (batch) => {
          gsap.fromTo(
            batch,
            { opacity: 0, ...offset },
            {
              opacity: 1,
              x: 0,
              y: 0,
              scale: 1,
              duration: DURATION,
              ease: EASE,
              // `amount` spreads the whole batch across a fixed total, so a
              // row of three and a list of twenty both finish promptly.
              stagger: { amount: Math.min(batch.length * STAGGER, STAGGER_CAP) },
              // `fromTo` applies the start state inline immediately, so the
              // elements are still hidden the moment the CSS rule stops
              // applying — no flash between the two.
              onStart: () => batch.forEach(done),
            },
          );
        },
      });
    };

    const setupReveals = (scope: ParentNode) => {
      const byKind = new Map<string, HTMLElement[]>();
      scope
        .querySelectorAll<HTMLElement>("[data-reveal]:not([data-revealed])")
        .forEach((el) => {
          const kind = el.getAttribute("data-reveal") || "up";
          const list = byKind.get(kind);
          if (list) list.push(el);
          else byKind.set(kind, [el]);
        });
      byKind.forEach(batchReveals);
    };

    /* ── Headings, line by line ─────────────────────────────────────────
       The effect the reference sites lean on hardest: each visual line rises
       out of a mask, one after another. `mask: "lines"` gives every line its
       own clipping parent, which is what makes a line appear from nothing
       rather than slide over its neighbour. */
    const setupSplits = (scope: ParentNode) => {
      scope
        .querySelectorAll<HTMLElement>("[data-split]:not([data-revealed])")
        .forEach((el) => {
          const split = SplitText.create(el, {
            type: "lines",
            mask: "lines",
            linesClass: "split-line",
          });
          splits.push(split);
          // The block was hidden only to cover the un-split flash.
          gsap.set(el, { opacity: 1 });
          done(el);

          gsap.from(split.lines, {
            yPercent: 115,
            duration: DURATION + 0.1,
            ease: EASE,
            stagger: STAGGER,
            scrollTrigger: { trigger: el, start: START, once: true },
          });
        });
    };

    /* ── Clip wipe ──────────────────────────────────────────────────────
       Batched for the same reason as the reveals: a row of lot images that
       all uncover at once looks like a single block changing state, not like
       a row of photographs arriving. */
    const setupClips = (scope: ParentNode) => {
      const els = [
        ...scope.querySelectorAll<HTMLElement>("[data-clip]:not([data-revealed])"),
      ];
      if (els.length === 0) return;

      ScrollTrigger.batch(els, {
        start: START,
        once: true,
        onEnter: (batch) => {
          gsap.fromTo(
            batch,
            { clipPath: "inset(100% 0 0 0)" },
            {
              clipPath: "inset(0% 0 0 0)",
              duration: 1,
              ease: EASE,
              // Slightly wider than the card cascade so the image finishes
              // uncovering just after its card has settled.
              stagger: {
                amount: Math.min(batch.length * (STAGGER + 0.02), STAGGER_CAP),
              },
              onStart: () => batch.forEach(done),
            },
          );
        },
      });
    };

    /* ── Drawn lines ────────────────────────────────────────────────────
       Scrubbed, like the parallax below and unlike everything above it: a
       progress line that does not track the scroll is not a progress line.
       Drives a `--p` custom property from 0 to 1; the CSS decides which axis
       that scales, because the rail is vertical on a phone and horizontal
       from `lg`. */
    const setupDraw = (scope: ParentNode) => {
      scope.querySelectorAll<HTMLElement>("[data-draw]").forEach((el) => {
        // The line is absolutely positioned inside its track, so the trigger
        // has to be the list it runs through, not the line itself.
        const trigger = el.closest("ol, ul, section") ?? el.parentElement ?? el;
        gsap.fromTo(
          el,
          { "--p": 0 },
          {
            "--p": 1,
            ease: "none",
            scrollTrigger: {
              trigger,
              start: "top 75%",
              // Completes a little before the list leaves, so the last step is
              // reached while it is still comfortably on screen.
              end: "bottom 70%",
              scrub: true,
            },
          },
        );
      });
    };

    /* ── Parallax ───────────────────────────────────────────────────────
       The one place scroll-LINKED progress belongs: the whole point is that
       it tracks the scroll. `scrub` is correct here and wrong for everything
       above. */
    const setupParallax = (scope: ParentNode) => {
      scope
        .querySelectorAll<HTMLElement>("[data-parallax]")
        .forEach((el) => {
          const depth = Number(el.getAttribute("data-parallax")) || 0.12;
          gsap.fromTo(
            el,
            { yPercent: -depth * 50 },
            {
              yPercent: depth * 50,
              ease: "none",
              scrollTrigger: {
                trigger: el.parentElement ?? el,
                start: "top bottom",
                end: "bottom top",
                scrub: true,
              },
            },
          );
        });
    };

    const SELECTOR =
      "[data-reveal],[data-split],[data-clip],[data-parallax],[data-draw]";

    /*
      `busy` is not an optimisation — without it this deadlocks the page.

      SplitText works by rewriting the heading's DOM, wrapping every visual
      line in new elements. Those insertions are themselves mutations, so the
      observer below sees them, rescans, and splits again: a feedback loop
      that pegs the main thread and hangs the tab. Suppressing our own writes
      is what breaks it.
    */
    let busy = false;

    const scan = (scope: ParentNode) => {
      if (busy) return;
      busy = true;
      ctx.add(() => {
        setupSplits(scope);
        setupReveals(scope);
        setupClips(scope);
        setupDraw(scope);
        setupParallax(scope);
      });
      busy = false;
    };

    scan(document);

    /*
      Elements that arrive after this point — the map/list tab panels, a new
      page of results — would otherwise sit hidden forever behind the CSS
      start state with nothing to animate them. This is what makes the
      `:not([data-revealed])` guard safe rather than a trap.

      Batched on a timer: a tab switch inserts dozens of nodes in one frame,
      and `ScrollTrigger.refresh()` re-measures every trigger on the page, so
      running it per node turns a cheap observer into a stall.
    */
    let queued: number | undefined;
    const observer = new MutationObserver((records) => {
      if (busy) return;
      const touched = records.some((r) =>
        [...r.addedNodes].some(
          (n) =>
            n.nodeType === 1 &&
            ((n as HTMLElement).matches?.(SELECTOR) ||
              (n as HTMLElement).querySelector?.(SELECTOR)),
        ),
      );
      if (!touched) return;

      clearTimeout(queued);
      queued = window.setTimeout(() => {
        scan(document);
        observeBackstop();
        ScrollTrigger.refresh();
      }, 150);
    });
    observer.observe(document.body, { childList: true, subtree: true });

    // Fonts change line boxes, which changes both the split lines and every
    // trigger position measured from them.
    document.fonts?.ready.then(() => ScrollTrigger.refresh());

    /*
      ── Backstop ────────────────────────────────────────────────────────

      The deadman timer in motion-arm-script only covers "GSAP never loaded".
      It does NOT cover the worse case: GSAP loads, reports ready, and then a
      ScrollTrigger never fires — a mis-measured trigger, a scroll container
      it did not expect, Lenis wired up wrong. The arming class stays on, the
      element stays at opacity 0, and a citizen is looking at a blank block
      with no error anywhere.

      So: anything that has actually been on screen for a moment and still has
      not been claimed gets shown, animation or not. Content winning over
      choreography is the only acceptable resolution on a public-service site.
    */
    const backstop = new IntersectionObserver((entries) => {
      for (const entry of entries) {
        const el = entry.target as HTMLElement;
        if (el.hasAttribute("data-revealed")) {
          backstop.unobserve(el);
          continue;
        }
        if (!entry.isIntersecting) continue;
        window.setTimeout(() => {
          if (el.hasAttribute("data-revealed")) return;
          done(el);
          gsap.set(el, { opacity: 1, x: 0, y: 0, scale: 1, clipPath: "none" });
        }, 1500);
      }
    });
    const observeBackstop = () =>
      document
        .querySelectorAll<HTMLElement>("[data-reveal],[data-split],[data-clip]")
        .forEach((el) => backstop.observe(el));
    observeBackstop();

    // Tell the deadman timer in motion-arm-script that motion is live.
    window.__motionReady = true;

    return () => {
      window.__motionReady = false;
      clearTimeout(queued);
      observer.disconnect();
      backstop.disconnect();
      gsap.ticker.remove(ticker);
      lenis.destroy();
      splits.forEach((s) => s.revert());
      ctx.revert();
      ScrollTrigger.getAll().forEach((t) => t.kill());
      /*
        Leave the page visible on the way out. A route change tears this down
        and rebuilds it; without this, anything mid-reveal would be handed to
        the next render still at opacity 0.
      */
      root.classList.remove("motion-armed");
      requestAnimationFrame(() => root.classList.add("motion-armed"));
    };
  }, [pathname]);

  return null;
}
