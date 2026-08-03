"use client";

import { useEffect, useRef } from "react";
import {
  animate,
  motion,
  useInView,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "motion/react";

import { formatFixed } from "@/lib/format";

/**
 * "4 820+" -> { target: 4820, decimals: 0, suffix: "+" }
 * "1,2 trln" -> { target: 1.2, decimals: 1, suffix: " trln" }
 *
 * The digit run only swallows a following space when it precedes MORE
 * digits ("12 340"), never a trailing space before a word ("3 kun") — that
 * distinguishes a thousands separator from a word boundary.
 */
function parseStat(raw: string) {
  const match = /^(\d+(?:\s\d+)*)(?:,(\d+))?(.*)$/.exec(raw.trim());
  if (!match) return null;
  const [, intPart, fracPart, suffix] = match;
  const target = Number(`${intPart.replace(/\s/g, "")}.${fracPart ?? "0"}`);
  if (!Number.isFinite(target)) return null;
  return { target, decimals: fracPart?.length ?? 0, suffix };
}

/**
 * Counts up from 0 to a stat's numeric value once it scrolls into view,
 * reusing the same Uzbek space/comma formatting as the rest of the site
 * (`formatFixed`) so mid-count values never flash Intl-default grouping.
 *
 * Server-rendered (and the first client paint, before the animation effect
 * runs) shows the plain final string — a no-JS visitor, a search engine, and
 * the pre-hydration flash all see the real number, never a "0". This also
 * self-guards on a government portal's accuracy bar: if re-formatting the
 * parsed number doesn't reproduce the original string byte-for-byte, the
 * value is left static rather than risk animating to a wrong figure.
 */
export function AnimatedStatValue({
  value,
  className,
}: {
  value: string;
  className?: string;
}) {
  const parsed = parseStat(value);
  // `formatFixed`'s thousands grouping uses a non-breaking space (NBSP,
  // U+00A0); hand-authored content like "4 820+" in homepage.ts uses a plain
  // space (U+0020). Same grouping, different codepoint — normalize both
  // before comparing, or every multi-group figure would fail the check below
  // and never animate.
  const normalizeSpaces = (s: string) => s.replace(/ /g, " ");
  const roundTrips =
    parsed !== null &&
    normalizeSpaces(
      `${formatFixed(parsed.target, parsed.decimals)}${parsed.suffix}`,
    ) === normalizeSpaces(value);

  const ref = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, amount: 0.6 });
  const prefersReducedMotion = useReducedMotion();

  const count = useMotionValue(roundTrips ? parsed!.target : 0);
  const display = useTransform(count, (latest) =>
    roundTrips ? `${formatFixed(latest, parsed!.decimals)}${parsed!.suffix}` : value,
  );

  useEffect(() => {
    if (!roundTrips || !isInView || prefersReducedMotion) return;
    count.set(0);
    const controls = animate(count, parsed!.target, {
      duration: 1.6,
      // Same "settling" curve as --ease-out-soft in globals.css.
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isInView, prefersReducedMotion, roundTrips]);

  if (!roundTrips) {
    return (
      <span ref={ref} className={className}>
        {value}
      </span>
    );
  }

  return (
    <motion.span ref={ref} className={className}>
      {display}
    </motion.span>
  );
}
