/**
 * Display formatting for Uzbek conventions: space as thousands separator,
 * comma as decimal mark.
 */

/** Non-breaking space, so "86,4 mln" never wraps mid-number. */
const NBSP = " ";

/*
  Number formatting is done by hand rather than through Intl.NumberFormat.

  Two reasons:

  1. Correctness — Uzbek groups thousands with a SPACE and marks decimals with
     a COMMA ("36 750 000", "86,4"). Several runtimes resolve `uz-UZ` to
     comma-grouping instead, which is simply wrong for this audience.
  2. Hydration — Intl output depends on the ICU data compiled into the
     runtime, and Node and the browser do not always agree. A number formatted
     one way on the server and another way on the client is a hydration
     mismatch. Doing the grouping ourselves makes it deterministic everywhere.
*/
function group(intPart: string): string {
  return intPart.replace(/\B(?=(\d{3})+(?!\d))/g, NBSP);
}

export function formatFixed(value: number, maxFractionDigits: number): string {
  const rounded =
    Math.round(value * 10 ** maxFractionDigits) / 10 ** maxFractionDigits;
  const [int, frac] = String(rounded).split(".");
  const grouped = group(int);
  return frac ? `${grouped},${frac}` : grouped;
}

/**
 * Compact so'm for card prices: 86_400_000 -> "86,4 mln".
 *
 * The legacy markup had these pre-rendered as strings ("86,4 mln"), which made
 * them unsortable and unfilterable. Values are numbers in the data now and
 * formatted here at the edge.
 */
export function formatSom(value: number): string {
  if (value >= 1_000_000_000_000) {
    return `${formatDecimal(value / 1_000_000_000_000)}${NBSP}trln`;
  }
  if (value >= 1_000_000_000) {
    return `${formatDecimal(value / 1_000_000_000)}${NBSP}mlrd`;
  }
  if (value >= 1_000_000) {
    return `${formatDecimal(value / 1_000_000)}${NBSP}mln`;
  }
  return formatNumber(value);
}

function formatDecimal(n: number): string {
  return formatFixed(n, 1);
}

/** 36750000 -> "36 750 000" */
export function formatNumber(value: number): string {
  return formatFixed(value, 0);
}

export function formatArea(m2: number): string {
  return `${formatNumber(m2)}${NBSP}m²`;
}

/**
 * ISO date -> "02.07.2025".
 *
 * Formatted from the string's own parts rather than through `new Date()`, so
 * server and client always agree regardless of timezone — a Date-based format
 * can render a different day either side of hydration.
 */
export function formatDate(iso: string): string {
  const [y, m, d] = iso.split("T")[0].split("-");
  return `${d}.${m}.${y}`;
}
