"use client";

import { useState } from "react";
import { Popover as PopoverPrimitive } from "radix-ui";
import { CalendarDays, ChevronLeft, ChevronRight, X } from "lucide-react";

import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

/*
  "Savdo kuni" — pick the calendar day an auction runs on.

  A CALENDAR, matching e-auksion's own filter, rather than the relative
  windows ("3 kungacha") the homepage chips use. Those answer "what is
  imminent"; this answers "what is being sold on the 27th", which is the
  question someone planning around a specific date actually has, and it is the
  control a citizen who has used e-auksion already knows.

  ONE THING IT DOES THAT e-auksion's DOES NOT: days with no lots are dead.
  There, every square is clickable and most return nothing, because auctions
  cluster on the working days the service schedules them for. Here the server
  passes the days that exist (see `getAuctionDays`), so the control cannot
  produce an empty result at all — and the month arrows stop at the edges of
  the real range instead of wandering into empty years.

  WHY A CLIENT COMPONENT, when the rest of the panel's state lives in the URL:
  a calendar is a popover with a month cursor, and neither is a filter — they
  are the act of choosing one. The chosen day still leaves through the hidden
  input below, as `?savdo=2026-08-27`, so the RESULT stays linkable, indexable
  and back-button-correct exactly like every other filter here.

  Selecting does not submit. The rest of the panel waits for Qidirish and so
  does this, so a reader can set a region, an area and a date before asking for
  anything — and so e-auksion's behaviour carries over unchanged.
*/

export interface AuctionDayLabels {
  /** Shown in the trigger when no day is chosen. */
  placeholder: string;
  clear: string;
  /** Twelve, January first. */
  months: string[];
  /** Seven, MONDAY first — the week Uzbekistan's calendars start on. */
  weekdays: string[];
  /** Screen-reader text for a day, e.g. "{count} ta lot". */
  lots: string;
}

/** "2026-08-27" → [2026, 7]. Parsed by hand; no Date, no timezone. */
function yearMonthOf(iso: string): [number, number] {
  const [y, m] = iso.split("-");
  return [Number(y), Number(m) - 1];
}

function isoOf(year: number, month: number, day: number): string {
  const p = (n: number) => String(n).padStart(2, "0");
  return `${year}-${p(month + 1)}-${p(day)}`;
}

/**
 * Weekday of the 1st, as an index into a MONDAY-first week.
 *
 * `Date.UTC` throughout, never the local constructor: this runs on a server in
 * one zone and a browser in another, and a grid built from local time would
 * start the month on a different square either side of hydration.
 */
function leadingBlanks(year: number, month: number): number {
  return (new Date(Date.UTC(year, month, 1)).getUTCDay() + 6) % 7;
}

function daysInMonth(year: number, month: number): number {
  // Day 0 of the next month is the last day of this one.
  return new Date(Date.UTC(year, month + 1, 0)).getUTCDate();
}

export function AuctionDayField({
  id,
  name,
  label,
  value,
  days,
  labels,
  className,
}: {
  id: string;
  /** Submitted as `name=YYYY-MM-DD`, and only when a day is chosen. */
  name: string;
  label: string;
  /** Current value from the URL, or undefined. */
  value?: string;
  /** Every day that has lots, ascending. Days outside this list are inert. */
  days: Array<{ date: string; count: number }>;
  labels: AuctionDayLabels;
  /** Grid placement from the panel — see search-widget.tsx. */
  className?: string;
}) {
  const [selected, setSelected] = useState<string | null>(value ?? null);
  const [open, setOpen] = useState(false);

  const countByDay = new Map(days.map((d) => [d.date, d.count]));
  const firstDay = days[0]?.date;
  const lastDay = days[days.length - 1]?.date;

  /*
    Which month the grid opens on: the chosen day, else the first month that
    has lots. Never "today" — on a portal whose next auction may be three
    weeks out, opening on an empty month makes the control look broken.
  */
  const [cursor, setCursor] = useState<[number, number]>(() =>
    yearMonthOf(selected ?? firstDay ?? new Date().toISOString().slice(0, 10)),
  );
  const [year, month] = cursor;

  const step = (delta: number) => {
    const next = new Date(Date.UTC(year, month + delta, 1));
    setCursor([next.getUTCFullYear(), next.getUTCMonth()]);
  };

  // The arrows stop at the real range rather than being disabled per-month, so
  // a gap in the middle of the season is still reachable by stepping through.
  const canGoBack = firstDay != null && isoOf(year, month, 1) > firstDay;
  const canGoForward =
    lastDay != null && isoOf(year, month, daysInMonth(year, month)) < lastDay;

  const blanks = leadingBlanks(year, month);
  const total = daysInMonth(year, month);

  return (
    <div className={cn("min-w-0", className)}>
      <label
        htmlFor={id}
        className="text-muted-foreground mb-1.5 block text-sm"
      >
        {label}
      </label>

      {/*
        Only present once a day is chosen, so a search with no date keeps a
        clean URL rather than carrying `?savdo=`.
      */}
      {selected ? <input type="hidden" name={name} value={selected} /> : null}

      <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
        <PopoverPrimitive.Trigger asChild>
          <button
            id={id}
            type="button"
            className="border-input bg-card text-foreground hover:border-ring/50 focus-visible:ring-ring flex h-11 w-full items-center justify-between gap-2 rounded-md border px-3 text-sm focus-visible:ring-2 focus-visible:outline-none"
          >
            {/*
              `opacity`, not a lighter colour. In the light theme
              --muted-foreground is navy-mid — deliberately close to the body
              colour — so a muted placeholder would read as a date the reader
              had already chosen. Opacity says "nothing here yet" in every
              palette, including high contrast where every ink is white. */}
            <span
              className={cn(
                "truncate",
                !selected && "text-muted-foreground opacity-70",
              )}
            >
              {selected ? formatDate(selected) : labels.placeholder}
            </span>
            <CalendarDays
              aria-hidden="true"
              className="size-4 shrink-0 opacity-70"
            />
          </button>
        </PopoverPrimitive.Trigger>

        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Content
            align="start"
            sideOffset={4}
            /* Same surface as the Select popup next door — see ui/select.tsx.
               `bg-popover` and the token ring rather than raw brand values, so
               the panel follows the tone and high-contrast palettes. */
            className="bg-popover text-popover-foreground ring-foreground/10 z-50 rounded-md p-3 shadow-md ring-1"
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => step(-1)}
                disabled={!canGoBack}
                aria-label={labels.months[month === 0 ? 11 : month - 1]}
                className="hover:bg-secondary rounded p-1 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronLeft aria-hidden="true" className="size-4" />
              </button>

              <div aria-live="polite" className="text-sm font-semibold">
                {labels.months[month]} {year}
              </div>

              <button
                type="button"
                onClick={() => step(1)}
                disabled={!canGoForward}
                aria-label={labels.months[month === 11 ? 0 : month + 1]}
                className="hover:bg-secondary rounded p-1 disabled:pointer-events-none disabled:opacity-30"
              >
                <ChevronRight aria-hidden="true" className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-7 gap-0.5">
              {labels.weekdays.map((w) => (
                <div
                  key={w}
                  className="text-muted-foreground pb-1 text-center text-[0.6875rem]"
                >
                  {w}
                </div>
              ))}

              {Array.from({ length: blanks }, (_, i) => (
                <div key={`blank-${i}`} />
              ))}

              {Array.from({ length: total }, (_, i) => {
                const date = isoOf(year, month, i + 1);
                const count = countByDay.get(date);
                const isSelected = date === selected;

                return (
                  <button
                    key={date}
                    type="button"
                    disabled={count == null}
                    aria-pressed={isSelected}
                    aria-label={
                      count == null
                        ? formatDate(date)
                        : `${formatDate(date)} — ${labels.lots.replace("{count}", String(count))}`
                    }
                    onClick={() => {
                      setSelected(date);
                      setOpen(false);
                    }}
                    className={cn(
                      "relative flex size-9 flex-col items-center justify-center rounded text-sm transition-colors",
                      /*
                        THREE cues separate a day that has lots from one that
                        does not — weight, the dot below, and opacity — because
                        no single one survives every palette. Colour is not
                        among them: --muted-foreground is white in high
                        contrast and navy-mid in the light theme, within a
                        point of the body ink in both, so a dimmer number
                        would have looked available on two of the four
                        combinations.
                      */
                      count == null
                        ? "text-muted-foreground cursor-default opacity-50"
                        : "hover:bg-secondary font-semibold",
                      isSelected &&
                        "bg-accent text-accent-foreground border-outline border font-semibold",
                    )}
                  >
                    {i + 1}
                    {/*
                      A dot, not a colour change, marks a day that has lots.
                      It is the cue that cannot be lost: --foreground and
                      --muted-foreground are both white in high contrast and a
                      shade apart in the light theme, so any colour-only
                      signal would collapse. A mark that is either present or
                      absent survives all four palettes.
                    */}
                    {count != null ? (
                      <span
                        aria-hidden="true"
                        className="absolute bottom-1 size-1 rounded-full bg-current opacity-60"
                      />
                    ) : null}
                  </button>
                );
              })}
            </div>

            {selected ? (
              <button
                type="button"
                onClick={() => {
                  setSelected(null);
                  setOpen(false);
                }}
                className="border-hairline text-muted-foreground hover:text-foreground mt-2 flex w-full items-center justify-center gap-1.5 rounded border-t pt-2 text-xs"
              >
                <X aria-hidden="true" className="size-3" />
                {labels.clear}
              </button>
            ) : null}
          </PopoverPrimitive.Content>
        </PopoverPrimitive.Portal>
      </PopoverPrimitive.Root>
    </div>
  );
}
