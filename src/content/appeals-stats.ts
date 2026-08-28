/*
  Murojaatlar — per-channel appeal/complaint counts, supplied whole by the
  operator (2026-08-28, screenshot of an internal table). No reporting
  period was given with the figures, so none is stated on the page — see
  CLAUDE.md's non-negotiable 6: a number is shown only with what is actually
  known about it, never a guessed date range.

  Numbers, row order and every source label are verbatim from the source
  table, with one spelling fix: the source table has "Shahsiy qabul";
  "shaxsiy" is the correct spelling of the word (personal/individual) and is
  used site-wide elsewhere, so this is a typo fix, not a reworded label.
*/

export type AppealSourceStat = {
  source: string;
  total: number;
  inProgress: number;
  closed: number;
};

export const appealSources: AppealSourceStat[] = [
  { source: "Tashkilot pochtasiga", total: 222, inProgress: 3, closed: 219 },
  { source: "Rahbarga murojaat", total: 6, inProgress: 0, closed: 6 },
  { source: "Ishonch telefoni", total: 10, inProgress: 0, closed: 10 },
  { source: "Call markaz", total: 20, inProgress: 0, closed: 20 },
  { source: "Xalq qabulxonasi", total: 2, inProgress: 1, closed: 1 },
];
