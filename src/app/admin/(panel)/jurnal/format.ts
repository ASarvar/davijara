/*
  Timestamps in the panel: dd.MM.yyyy HH:mm, in the reader's own clock.

  NOT lib/format.ts's `formatDate`, which prints a calendar date for a citizen
  reading an announcement. An audit entry needs the time of day — "who changed
  this at 17:40" is the question the log answers — and the column stores UTC,
  which for an operator in Tashkent is five hours behind the wall clock they
  remember making the change by.

  Hand-rolled rather than `Intl.DateTimeFormat` for the same reason
  lib/format.ts is: Intl output for uz-UZ differs between Node and the
  browser, and this string is rendered on the server and hydrated in the
  browser. A mismatch there is a hydration error.
*/
export function formatStamp(iso: string): string {
  const date = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    `${pad(date.getDate())}.${pad(date.getMonth() + 1)}.${date.getFullYear()}` +
    ` ${pad(date.getHours())}:${pad(date.getMinutes())}`
  );
}
